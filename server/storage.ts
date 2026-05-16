/**
 * Storage helpers backed by Cloudinary.
 * Drop-in replacement for the Manus forge storage proxy.
 * All call sites (storagePut / storageGet / storageDownload / storageGetUploadUrl) work unchanged.
 */
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── helpers ────────────────────────────────────────────────────────────────

/** Strip leading slashes */
function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Sanitize a filename for use as a storage key segment.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-/]/g, "_");
}

/** Derive a Cloudinary resource_type from a MIME type string. */
function resourceTypeFromMime(mimeType: string): "image" | "video" | "raw" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "video"; // Cloudinary treats audio as video
  return "raw";
}

/** Derive resource_type from file extension (used when MIME is unavailable). */
function resourceTypeFromKey(key: string): "image" | "video" | "raw" {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "tiff", "bmp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm", "flv", "m4v", "mp3", "wav", "aac", "m4a"].includes(ext)) return "video";
  return "raw";
}

/**
 * Build the canonical Cloudinary delivery URL for a public_id.
 * Pure URL construction — no API call required.
 */
function buildCloudinaryUrl(publicId: string, resourceType: "image" | "video" | "raw"): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME is not set");
  // For image/video Cloudinary appends the extension automatically; strip it from public_id
  const pid = resourceType === "raw" ? publicId : publicId.replace(/\.[^/.]+$/, "");
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${pid}`;
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Upload bytes to Cloudinary.
 * Returns { key, url } — same contract as the forge proxy.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const resourceType = resourceTypeFromMime(contentType);

  // Split key into folder + public_id
  const lastSlash = key.lastIndexOf("/");
  const folder = lastSlash >= 0 ? key.substring(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
  // Remove extension from public_id — Cloudinary appends the correct one
  const publicIdBase = filename.replace(/\.[^/.]+$/, "");
  const publicId = folder ? `${folder}/${publicIdBase}` : publicIdBase;

  const buffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data as Uint8Array | string);

  const uploadOptions: any = {
    resource_type: resourceType,
    public_id: publicId,
    overwrite: true,
    chunk_size: 20_000_000, // 20 MB chunks
  };

  // upload_chunked_stream is the v2-compatible writable stream variant.
  // upload_large expects a file-system path string and calls path.split() internally,
  // throwing "path.split is not a function" when given a Buffer.
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_chunked_stream(
      uploadOptions,
      (error: any, result: any) => {
        if (error) reject(new Error(`Cloudinary upload failed: ${error.message}`));
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });

  return { key, url: result.secure_url as string };
}

/**
 * Get a delivery URL for a stored key.
 * Returns { key, url } — same contract as the forge proxy.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const resourceType = resourceTypeFromKey(key);
  const url = buildCloudinaryUrl(key, resourceType);
  return { key, url };
}

/**
 * Download file bytes from Cloudinary.
 * Returns { buffer, contentType } — same contract as the forge proxy.
 */
export async function storageDownload(relKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  const { url } = await storageGet(relKey);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`storageDownload: fetch failed (${response.status}) for key: ${relKey}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

/**
 * Get an upload URL for direct client-side uploads.
 * Returns { key, uploadUrl, publicUrl } — same contract as the forge proxy.
 */
export async function storageGetUploadUrl(
  relKey: string,
  contentType: string
): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const key = normalizeKey(relKey);
  const resourceType = resourceTypeFromMime(contentType);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME is not set");
  const publicUrl = buildCloudinaryUrl(key, resourceType);
  return {
    key,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    publicUrl,
  };
}
