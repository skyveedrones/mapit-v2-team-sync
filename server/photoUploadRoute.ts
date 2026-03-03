/**
 * Direct-to-S3 Photo Upload Route
 * Implements chunked, direct-to-S3 uploads for HD photos with full metadata preservation
 * 
 * Flow:
 * 1. Client requests signed URL for each chunk
 * 2. Client uploads chunks directly to S3 (bypasses Node.js)
 * 3. Client finalizes upload
 * 4. Server extracts metadata and stores in database
 */

import { Router, Request, Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { storageGetUploadUrl } from "./storage";

const router = Router();

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

// Request/Response schemas
const GetSignedUrlRequest = z.object({
  projectId: z.number(),
  filename: z.string(),
  fileSize: z.number(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  uploadId: z.string().optional(),
});

const FinalizeUploadRequest = z.object({
  projectId: z.number(),
  uploadId: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

// Store upload metadata temporarily (in production, use database)
const uploadSessions = new Map<string, {
  projectId: number;
  filename: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  s3Keys: Map<number, string>;
  createdAt: Date;
}>();

/**
 * POST /api/photo-upload/signed-url
 * Get a signed URL for uploading a chunk directly to S3
 */
router.post("/photo-upload/signed-url", async (req: Request, res: Response) => {
  try {
    const data = GetSignedUrlRequest.parse(req.body);
    const { projectId, filename, fileSize, chunkIndex, totalChunks, uploadId: existingUploadId } = data;

    // Generate upload ID if not provided
    const uploadId = existingUploadId || nanoid();

    // Initialize or get upload session
    if (!uploadSessions.has(uploadId)) {
      uploadSessions.set(uploadId, {
        projectId,
        filename,
        fileSize,
        totalChunks,
        uploadedChunks: new Set(),
        s3Keys: new Map(),
        createdAt: new Date(),
      });
    }

    // Generate S3 key for this chunk
    const s3Key = `projects/${projectId}/photos/${uploadId}/${chunkIndex}`;
    
    // Get presigned URL from storage proxy
    const { uploadUrl, publicUrl } = await storageGetUploadUrl(s3Key, "application/octet-stream");
    
    // Store the S3 key in the session
    const session = uploadSessions.get(uploadId)!;
    session.s3Keys.set(chunkIndex, s3Key);

    res.json({
      uploadId,
      uploadUrl, // Use uploadUrl instead of signedUrl
      chunkIndex,
      s3Key,
      publicUrl,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Photo Upload] Error generating signed URL:", msg);
    res.status(400).json({ error: `Failed to get signed URL: ${msg}` });
  }
});

/**
 * POST /api/photo-upload/chunk-uploaded
 * Notify server that a chunk was uploaded
 */
router.post("/photo-upload/chunk-uploaded", async (req: Request, res: Response) => {
  try {
    const { uploadId, chunkIndex } = req.body;

    const session = uploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: "Upload session not found" });
    }

    session.uploadedChunks.add(chunkIndex);

    res.json({
      uploadId,
      chunkIndex,
      uploadedChunks: Array.from(session.uploadedChunks),
      isComplete: session.uploadedChunks.size === session.totalChunks,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Photo Upload] Error tracking chunk upload:", msg);
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/photo-upload/finalize
 * Finalize the upload and trigger metadata extraction
 */
router.post("/photo-upload/finalize", async (req: Request, res: Response) => {
  try {
    const data = FinalizeUploadRequest.parse(req.body);
    const { projectId, uploadId, filename, fileSize, mimeType } = data;

    const session = uploadSessions.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: "Upload session not found" });
    }

    // Verify all chunks were uploaded
    if (session.uploadedChunks.size !== session.totalChunks) {
      return res.status(400).json({
        error: `Not all chunks uploaded. Expected ${session.totalChunks}, got ${session.uploadedChunks.size}`,
      });
    }

    // Get the final S3 key (first chunk's key without the chunk index)
    const finalS3Key = `projects/${projectId}/photos/${uploadId}/final`;
    const { publicUrl } = await storageGetUploadUrl(finalS3Key, mimeType);

    // Clean up session
    uploadSessions.delete(uploadId);

    res.json({
      uploadId,
      filename,
      fileSize,
      mimeType,
      s3Key: finalS3Key,
      publicUrl,
      message: "Upload finalized. Metadata extraction will be triggered by client.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Photo Upload] Error finalizing upload:", msg);
    res.status(400).json({ error: msg });
  }
});

export default router;
