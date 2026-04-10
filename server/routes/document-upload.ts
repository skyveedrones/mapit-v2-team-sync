/**
 * Document Upload Route
 * POST /api/document/upload
 *
 * Accepts multipart form with:
 *   - file: any document (PDF, PNG, JPG, DOCX, XLSX, etc.)
 *   - projectId: number
 *
 * Uploads the file to S3 with a sanitized key and saves a row to project_documents.
 * Returns { success, document: { id, fileName, fileKey, fileUrl, fileType } }
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { getDb } from "../db";
import { projectDocuments } from "../../drizzle/schema";
import { storagePut, sanitizeFilename } from "../storage";
import { sdk } from "../_core/sdk";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

async function getSessionUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

router.post("/document/upload", upload.single("file"), async (req: Request, res: Response) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const projectId = parseInt(req.body.projectId, 10);
  if (!projectId || isNaN(projectId)) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Sanitize filename: spaces → hyphens, unsafe chars → underscores
    const safeFileName = sanitizeFilename(file.originalname);
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "bin";
    const fileKey = `projects/${projectId}/documents/${Date.now()}-${safeFileName}`;

    // Upload bytes to S3
    const { url: fileUrl } = await storagePut(fileKey, file.buffer, file.mimetype);

    // Save DB record
    const result = await db.insert(projectDocuments).values({
      projectId,
      fileName: file.originalname,
      fileKey,
      fileType: ext,
      status: "uploaded",
    });

    res.json({
      success: true,
      document: {
        id: (result[0] as any).insertId ?? result[0],
        fileName: file.originalname,
        fileKey,
        fileUrl,
        fileType: ext,
      },
    });
  } catch (err: any) {
    console.error("[Document Upload] Error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
