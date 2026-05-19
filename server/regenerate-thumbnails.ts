/**
 * Utility to regenerate missing thumbnails for media files.
 * Handles both images (via sharp) and videos (via ffmpeg).
 *
 * Safety limits:
 *   - Skips files larger than MAX_FILE_BYTES (50 MB) to avoid OOM
 *   - Each item is wrapped in a per-item timeout (30 s)
 */

import { getDb } from "./db";
import { media } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { generateThumbnail } from "./watermark";
import { extractVideoThumbnailFromUrl } from "./videoThumbnail";
import { nanoid } from "nanoid";

/** Maximum file size we will download for thumbnail generation (images only — videos use URL-based ffmpeg). */
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

/** Per-item processing timeout in milliseconds (120s to allow ffmpeg to seek large remote videos). */
const ITEM_TIMEOUT_MS = 120_000;

/**
 * Fetch a file from URL with a size guard.
 * Returns null (instead of throwing) when the file exceeds MAX_FILE_BYTES.
 */
async function fetchBufferWithSizeGuard(url: string): Promise<Buffer | null> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  // Honour Content-Length if present
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
    console.warn(`[RegenerateThumbnails] Skipping oversized image (${contentLength} bytes): ${url}`);
    return null;
  }

  // Stream into a buffer, bailing out if we exceed the cap mid-stream
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = response.body!.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      reader.cancel();
      console.warn(`[RegenerateThumbnails] Skipping oversized image (stream exceeded ${MAX_IMAGE_BYTES} bytes): ${url}`);
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** Wrap a promise with a timeout; resolves to null on timeout instead of throwing. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[RegenerateThumbnails] Timeout (${ms}ms) for ${label}`);
      resolve(null);
    }, ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((err) => { clearTimeout(timer); console.error(`[RegenerateThumbnails] Error for ${label}:`, err); resolve(null); });
  });
}

/**
 * Regenerate thumbnails for media files with NULL or broken thumbnailUrl.
 * Pass a projectId to scope to a single project.
 */
export async function regenerateMissingThumbnails(projectId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Failed to connect to database");

  const mediaWithoutThumbnails = projectId
    ? await db
        .select()
        .from(media)
        .where(
          sql`(${media.thumbnailUrl} IS NULL OR ${media.thumbnailUrl} LIKE '%cloudinary%') AND ${media.projectId} = ${projectId}`
        )
    : await db
        .select()
        .from(media)
        .where(sql`${media.thumbnailUrl} IS NULL OR ${media.thumbnailUrl} LIKE '%cloudinary%'`);

  console.log(`[RegenerateThumbnails] Found ${mediaWithoutThumbnails.length} items to process`);

  const results = {
    success: [] as number[],
    failed: [] as { id: number; error: string }[],
  };

  for (const mediaItem of mediaWithoutThumbnails) {
    const isVideo = mediaItem.mimeType.startsWith("video/");
    const isImage = mediaItem.mimeType.startsWith("image/");

    if (!isImage && !isVideo) {
      console.log(`[RegenerateThumbnails] Skipping unsupported type ${mediaItem.mimeType} (id=${mediaItem.id})`);
      continue;
    }

    const result = await withTimeout(
      processItem(db, mediaItem, isVideo),
      ITEM_TIMEOUT_MS,
      `media ${mediaItem.id} (${mediaItem.filename})`
    );

    if (result === null) {
      results.failed.push({ id: mediaItem.id, error: "Timeout or unhandled error" });
    } else if (result.ok) {
      results.success.push(mediaItem.id);
    } else {
      results.failed.push({ id: mediaItem.id, error: result.error });
    }
  }

  console.log(`[RegenerateThumbnails] Done — success: ${results.success.length}, failed: ${results.failed.length}`);
  return results;
}

async function processItem(
  db: Awaited<ReturnType<typeof getDb>>,
  mediaItem: { id: number; projectId: number; filename: string; mimeType: string; url: string },
  isVideo: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    let thumbBuffer: Buffer | null = null;

    if (isVideo) {
      // Use URL-based ffmpeg — no download needed, works for any file size
      console.log(`[RegenerateThumbnails] Extracting video thumbnail from URL: ${mediaItem.url}`);
      thumbBuffer = await extractVideoThumbnailFromUrl(mediaItem.url, 1);
    } else {
      // Images: download buffer (capped at 50 MB)
      const fileBuffer = await fetchBufferWithSizeGuard(mediaItem.url);
      if (!fileBuffer) {
        return { ok: false, error: "Image too large (>50 MB), skipped" };
      }
      thumbBuffer = await generateThumbnail(fileBuffer, 300);
    }

    if (!thumbBuffer) {
      return { ok: false, error: "Thumbnail generation returned null" };
    }

    const uniqueId = nanoid(12);
    const thumbKey = `projects/${mediaItem.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
    const { url: thumbUrl } = await storagePut(thumbKey, thumbBuffer, "image/jpeg");

    await db!
      .update(media)
      .set({ thumbnailUrl: thumbUrl, updatedAt: new Date().toISOString() })
      .where(eq(media.id, mediaItem.id));

    console.log(`[RegenerateThumbnails] ✓ id=${mediaItem.id} → ${thumbUrl}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[RegenerateThumbnails] ✗ id=${mediaItem.id}:`, msg);
    return { ok: false, error: msg };
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  regenerateMissingThumbnails(projectId)
    .then((r) => process.exit(r.failed.length > 0 ? 1 : 0))
    .catch(() => process.exit(1));
}
