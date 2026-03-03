/**
 * Direct-to-S3 Photo Upload Utility
 * Handles chunked uploads directly to S3 using signed URLs
 * Preserves full metadata and HD quality without compression
 */

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export interface UploadProgress {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  uploadSpeed: number; // bytes per second
  eta: number; // seconds remaining
  bytesUploaded: number;
}

export interface SignedUrlResponse {
  uploadId: string;
  signedUrl: string;
  chunkIndex: number;
  s3Key: string;
}

/**
 * Get signed URL for uploading a chunk to S3
 */
export async function getSignedUrl(
  projectId: number,
  filename: string,
  fileSize: number,
  chunkIndex: number,
  totalChunks: number,
  uploadId?: string
): Promise<SignedUrlResponse> {
  const response = await fetch("/api/photo-upload/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      filename,
      fileSize,
      chunkIndex,
      totalChunks,
      uploadId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get signed URL: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a single chunk directly to S3 using signed URL
 */
export async function uploadChunkToS3(
  signedUrl: string,
  chunk: Blob,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during S3 upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("S3 upload aborted"));
    });

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.send(chunk);
  });
}

/**
 * Notify server that a chunk was uploaded
 */
export async function notifyChunkUploaded(
  uploadId: string,
  chunkIndex: number
): Promise<void> {
  const response = await fetch("/api/photo-upload/chunk-uploaded", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, chunkIndex }),
  });

  if (!response.ok) {
    throw new Error(`Failed to notify chunk upload: ${response.statusText}`);
  }
}

/**
 * Finalize the upload and trigger metadata extraction
 */
export async function finalizePhotoUpload(
  projectId: number,
  uploadId: string,
  filename: string,
  fileSize: number,
  mimeType: string
): Promise<{ success: boolean; finalUrl: string; s3Key: string }> {
  const response = await fetch("/api/photo-upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      uploadId,
      filename,
      fileSize,
      mimeType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to finalize upload: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get upload status
 */
export async function getUploadStatus(uploadId: string): Promise<UploadProgress> {
  const response = await fetch(`/api/photo-upload/status/${uploadId}`);

  if (!response.ok) {
    throw new Error(`Failed to get upload status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a photo file directly to S3 with chunking and progress tracking
 */
export async function uploadPhotoToS3(
  file: File,
  projectId: number,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal
): Promise<{ uploadId: string; finalUrl: string; s3Key: string }> {
  const fileSize = file.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  let uploadId: string = "";
  const startTime = Date.now();
  let uploadedBytes = 0;

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Check for abort signal
      if (signal?.aborted) {
        throw new Error("Upload aborted by user");
      }

      // Get signed URL for this chunk
      const { uploadId: newUploadId, signedUrl } = await getSignedUrl(
        projectId,
        file.name,
        fileSize,
        chunkIndex,
        totalChunks,
        uploadId
      );

      if (!uploadId) {
        uploadId = newUploadId;
      }

      // Extract chunk data
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);

      // Upload chunk to S3
      let chunkUploadedBytes = 0;
      await uploadChunkToS3(signedUrl, chunk, (loaded) => {
        chunkUploadedBytes = loaded;

        // Calculate overall progress
        const totalUploaded = uploadedBytes + chunkUploadedBytes;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = totalUploaded / elapsed;
        const remaining = fileSize - totalUploaded;
        const eta = remaining / speed;
        const progress = (totalUploaded / fileSize) * 90; // 90% for upload

        if (onProgress) {
          onProgress({
            uploadId,
            chunkIndex,
            totalChunks,
            uploadedChunks: chunkIndex + 1,
            progress,
            uploadSpeed: speed,
            eta,
            bytesUploaded: totalUploaded,
          });
        }
      });

      uploadedBytes += chunk.size;

      // Notify server that chunk was uploaded
      await notifyChunkUploaded(uploadId, chunkIndex);
    }

    // Finalize upload
    if (!uploadId) {
      throw new Error("Upload ID not set");
    }

    const result = await finalizePhotoUpload(
      projectId,
      uploadId,
      file.name,
      fileSize,
      file.type
    );

    // Add uploadId to result
    const finalResult = {
      uploadId,
      finalUrl: result.finalUrl,
      s3Key: result.s3Key,
    };

    if (onProgress) {
      onProgress({
        uploadId,
        chunkIndex: totalChunks - 1,
        totalChunks,
        uploadedChunks: totalChunks,
        progress: 100,
        uploadSpeed: fileSize / ((Date.now() - startTime) / 1000),
        eta: 0,
        bytesUploaded: fileSize,
      });
    }

    return finalResult;
  } catch (error) {
    console.error("[Photo Upload] Error:", error);
    throw error;
  }
}
