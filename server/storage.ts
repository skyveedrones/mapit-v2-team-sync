/**
 * Storage helpers backed by Cloudflare R2 (S3-compatible).
 *
 * All existing URLs in the database (CloudFront / Cloudinary) are untouched —
 * this module only handles NEW uploads going forward.
 *
 * Required environment variables (set in Railway):
 *   R2_ACCOUNT_ID        – Cloudflare account ID
 *   R2_ACCESS_KEY_ID     – R2 API token Access Key ID
 *   R2_SECRET_ACCESS_KEY – R2 API token Secret Access Key
 *   R2_BUCKET_NAME       – R2 bucket name (e.g. "mapit-media")
 *   R2_PUBLIC_URL        – Public base URL for the bucket
 *                          e.g. "https://pub-<hash>.r2.dev" (R2 public bucket URL)
 *                          or a custom domain like "https://media.mapit.skyveedrones.com"
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand,
  CreateMultipartUploadCommand,
  UploadPartCopyCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── config ─────────────────────────────────────────────────────────────────

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "R2 storage credentials missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL in Railway."
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket, publicUrl };
}

// ─── CORS bootstrap ──────────────────────────────────────────────────────────

/**
 * Apply CORS policy to the R2 bucket via the S3 API so browsers can PUT
 * files directly to R2 (presigned URL uploads) without routing through Railway.
 *
 * Called once at server startup. Safe to call repeatedly — idempotent.
 */
export async function ensureR2Cors(): Promise<void> {
  try {
    const { client, bucket } = getR2Config();
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [
                "https://mapit.skyveedrones.com",
                "https://mapit-skyveedrones.pages.dev",
                // Wildcard for any future Cloudflare Pages preview deployments
                "https://*.mapit-skyveedrones.pages.dev",
              ],
              AllowedMethods: ["PUT", "GET", "HEAD"],
              AllowedHeaders: ["Content-Type", "Content-Length", "*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.log("[R2] CORS policy applied to bucket:", bucket);
  } catch (err) {
    // Log but don't crash — uploads fall back to chunked path if CORS is missing
    console.error("[R2] Failed to apply CORS policy:", err);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Strip leading slashes and normalise separators */
function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\\/g, "/");
}

/**
 * Sanitize a filename for use as a storage key segment:
 * replaces spaces with hyphens and strips characters that are unsafe in S3/R2 keys.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-/]/g, "_");
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Upload bytes to R2 and return the permanent public URL.
 * The returned URL is stored directly in media.url — no proxy needed.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { client, bucket, publicUrl } = getR2Config();
  const key = normalizeKey(relKey);
  const body = Buffer.isBuffer(data)
    ? data
    : typeof data === "string"
    ? Buffer.from(data, "utf-8")
    : Buffer.from(data as Uint8Array);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: `${publicUrl}/${key}` };
}

/**
 * Get the public URL for an existing key.
 * For R2 public buckets the URL is deterministic — no signing needed.
 * Falls back to a presigned URL if the bucket is private.
 */
export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const { client, bucket, publicUrl } = getR2Config();
  const key = normalizeKey(relKey);

  // If the key looks like a full URL already (legacy CloudFront / Cloudinary rows),
  // return it unchanged so the frontend continues to work.
  if (relKey.startsWith("http://") || relKey.startsWith("https://")) {
    return { key: relKey, url: relKey };
  }

  // For public R2 buckets the permanent URL is sufficient.
  // If you make the bucket private, swap this for the presigned URL below.
  const permanentUrl = `${publicUrl}/${key}`;

  // Presigned fallback (uncomment if bucket is private):
  // const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  // const presignedUrl = await getSignedUrl(client, command, { expiresIn });
  // return { key, url: presignedUrl };

  return { key, url: permanentUrl };
}

/**
 * Download file bytes directly from R2.
 * Uses a presigned GET URL so the server never streams through a proxy.
 */
export async function storageDownload(
  relKey: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const { client, bucket } = getR2Config();
  const key = normalizeKey(relKey);

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  const response = await fetch(presignedUrl);
  if (!response.ok) {
    throw new Error(
      `storageDownload: fetch failed (${response.status}) for key: ${key}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

/**
 * Generate a presigned PUT URL so the browser can upload directly to R2,
 * bypassing the Railway server entirely (no memory / timeout limits).
 *
 * Returns:
 *   uploadUrl  – presigned PUT URL (browser POSTs directly here)
 *   publicUrl  – permanent public URL that gets saved to media.url
 */
export async function storageGetUploadUrl(
  relKey: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const { client, bucket, publicUrl: baseUrl } = getR2Config();
  const key = normalizeKey(relKey);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    key,
    uploadUrl,
    publicUrl: `${baseUrl}/${key}`,
  };
}

/**
 * Delete an object from R2.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const { client, bucket } = getR2Config();
  const key = normalizeKey(relKey);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Assemble temp chunk objects into a final file using S3 server-side multipart copy.
 * NO bytes are downloaded to Railway — all copying happens inside R2.
 *
 * Chunk keys must follow the pattern: temp-chunks/{uploadId}/chunk-{00000..N}
 * Each chunk must be >= 5 MB except the last one (S3 multipart minimum).
 *
 * @param uploadId   - The upload session ID
 * @param totalChunks - Total number of chunks
 * @param destKey    - Final destination key (relative, e.g. "projects/1/media/abc.mp4")
 * @param contentType - MIME type of the final file
 * @returns public URL of the assembled file
 */
export async function assembleChunksViaMultipartCopy(
  uploadId: string,
  totalChunks: number,
  destKey: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { client, bucket, publicUrl: baseUrl } = getR2Config();
  const finalKey = normalizeKey(destKey);

  // 1. Create multipart upload
  const createRes = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: finalKey,
      ContentType: contentType,
    })
  );
  const mpUploadId = createRes.UploadId!;

  try {
    // 2. Copy each chunk as a part
    const parts: { ETag: string; PartNumber: number }[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = normalizeKey(
        `temp-chunks/${uploadId}/chunk-${i.toString().padStart(5, "0")}`
      );

      // Verify chunk exists and get its size
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: chunkKey })
      );
      const chunkSize = head.ContentLength ?? 0;

      const copyRes = await client.send(
        new UploadPartCopyCommand({
          Bucket: bucket,
          Key: finalKey,
          UploadId: mpUploadId,
          PartNumber: i + 1,
          CopySource: `${bucket}/${chunkKey}`,
          // R2 requires explicit byte range for UploadPartCopy
          CopySourceRange: `bytes=0-${chunkSize - 1}`,
        })
      );

      parts.push({
        ETag: copyRes.CopyPartResult!.ETag!,
        PartNumber: i + 1,
      });

      console.log(`[MultipartCopy] Part ${i + 1}/${totalChunks} copied (${Math.round(chunkSize / 1024)}KB)`);
    }

    // 3. Complete the multipart upload
    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: finalKey,
        UploadId: mpUploadId,
        MultipartUpload: { Parts: parts },
      })
    );

    console.log(`[MultipartCopy] Assembly complete: ${finalKey}`);
    return { key: finalKey, url: `${baseUrl}/${finalKey}` };
  } catch (err) {
    // Abort the multipart upload to avoid orphaned parts
    try {
      await client.send(
        new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: finalKey,
          UploadId: mpUploadId,
        })
      );
    } catch {
      /* ignore abort errors */
    }
    throw err;
  }
}

/**
 * Delete all temp chunk objects for a given uploadId.
 */
export async function deleteChunks(uploadId: string, totalChunks: number): Promise<void> {
  const { client, bucket } = getR2Config();
  for (let i = 0; i < totalChunks; i++) {
    const chunkKey = normalizeKey(
      `temp-chunks/${uploadId}/chunk-${i.toString().padStart(5, "0")}`
    );
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: chunkKey }));
    } catch {
      /* ignore individual delete errors */
    }
  }
  console.log(`[MultipartCopy] Deleted ${totalChunks} temp chunks for uploadId=${uploadId}`);
}
