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
