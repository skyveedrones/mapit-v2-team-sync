/**
 * Server-side video thumbnail extraction using FFmpeg.
 * Extracts a single frame at 1 second (or 10% of duration) as a JPEG buffer.
 * Used as a fallback when the client cannot generate a thumbnail (e.g., H.265/HEVC).
 */
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { nanoid } from "nanoid";

// Use bundled ffmpeg binary from @ffmpeg-installer/ffmpeg when available,
// otherwise fall back to system ffmpeg (e.g., Railway Nixpacks).
function setFfmpegPath(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
    if (ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) {
      ffmpeg.setFfmpegPath(ffmpegInstaller.path);
      console.log("[VideoThumbnail] Using bundled ffmpeg:", ffmpegInstaller.path);
      return;
    }
  } catch {
    // @ffmpeg-installer/ffmpeg not available — fall through to system ffmpeg
  }
  console.log("[VideoThumbnail] Using system ffmpeg");
}

setFfmpegPath();

/**
 * Extract a thumbnail frame from a video buffer.
 * Writes the buffer to a temp file, runs ffmpeg, reads the output JPEG, then cleans up.
 *
 * @param videoBuffer - Raw video file bytes
 * @param mimeType    - MIME type of the video (e.g. "video/mp4")
 * @param seekSeconds - Timestamp in seconds to capture (default: 1)
 * @returns JPEG buffer, or null if extraction fails
 */
export async function extractVideoThumbnail(
  videoBuffer: Buffer,
  mimeType: string,
  seekSeconds = 1
): Promise<Buffer | null> {
  const ext = mimeType.includes("quicktime") ? ".mov"
    : mimeType.includes("webm") ? ".webm"
    : mimeType.includes("avi") ? ".avi"
    : ".mp4";

  const uniqueId = nanoid(12);
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `vthumb_in_${uniqueId}${ext}`);
  const outputPath = path.join(tempDir, `vthumb_out_${uniqueId}.jpg`);

  try {
    // Write video to temp file
    fs.writeFileSync(inputPath, videoBuffer);

    // Run ffmpeg to extract frame
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(seekSeconds)
        .frames(1)
        .outputOptions(["-vf", "scale=480:-1", "-q:v", "3"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => {
          // If seek past end of file, try frame 0
          if (seekSeconds > 0) {
            ffmpeg(inputPath)
              .seekInput(0)
              .frames(1)
              .outputOptions(["-vf", "scale=480:-1", "-q:v", "3"])
              .output(outputPath)
              .on("end", () => resolve())
              .on("error", reject)
              .run();
          } else {
            reject(err);
          }
        })
        .run();
    });

    if (!fs.existsSync(outputPath)) {
      console.error("[VideoThumbnail] Output file not created");
      return null;
    }

    const thumbBuffer = fs.readFileSync(outputPath);
    return thumbBuffer;
  } catch (err) {
    console.error("[VideoThumbnail] Failed to extract thumbnail:", err);
    return null;
  } finally {
    // Clean up temp files
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
  }
}
