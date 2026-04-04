/**
 * PDF to PNG Overlay Converter Route
 * POST /api/convert-pdf-overlay
 *
 * Accepts a multipart form with:
 *   - file: PDF file
 *   - lineColor: Color for blueprint lines (MAPIT_GREEN, SAFETY_ORANGE, etc.)
 *   - whiteThreshold: Threshold for white background detection (200-255)
 *   - dpi: Resolution in DPI (150, 200, or 300)
 *
 * Converts PDF to high-contrast transparent PNG with customizable line color.
 * Returns the PNG URL and filename.
 */

import express, { Router, Request, Response } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import { sdk } from "../_core/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const router = Router();
const execFileAsync = promisify(execFile);

// Multer config — store files in memory (max 50 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Session helper via SDK
async function getSessionUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch (e) {
    console.error("[PDF Converter] Auth error:", e);
    return null;
  }
}

// Color palette for overlay lines
const COLOR_PALETTE: Record<string, [number, number, number]> = {
  MAPIT_GREEN: [0, 255, 136],
  SAFETY_ORANGE: [255, 121, 0],
  ELECTRIC_BLUE: [0, 191, 255],
  HOT_PINK: [255, 0, 255],
  HI_VIZ_YELLOW: [255, 255, 0],
};

// Convert PDF to PNG using pdftoppm (poppler-utils)
async function pdfToPng(pdfBuffer: Buffer, dpi: number): Promise<Buffer> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pdf-convert-"));
  const inputPath = join(tmpDir, "input.pdf");
  const outputPrefix = join(tmpDir, "page");

  try {
    await writeFile(inputPath, pdfBuffer);
    // -r DPI = resolution, -f 1 -l 1 = first page only, -png = PNG output
    await execFileAsync("pdftoppm", [
      "-r",
      dpi.toString(),
      "-f",
      "1",
      "-l",
      "1",
      "-png",
      inputPath,
      outputPrefix,
    ]);

    const files = (await readdir(tmpDir)).filter((f) => f.endsWith(".png"));
    if (files.length === 0) throw new Error("pdftoppm produced no PNG files");

    const pngBuffer = await readFile(join(tmpDir, files[0]));
    return pngBuffer;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Process PNG: remove white background and recolor lines using a Node.js script
async function processPngOverlay(
  pngBuffer: Buffer,
  lineColor: [number, number, number],
  whiteThreshold: number
): Promise<Buffer> {
  const tmpDir = await mkdtemp(join(tmpdir(), "png-process-"));
  const inputPath = join(tmpDir, "input.png");
  const outputPath = join(tmpDir, "output.png");
  const scriptPath = join(tmpDir, "process.mjs");

  try {
    // Write input PNG
    await writeFile(inputPath, pngBuffer);

    // Create a Node.js script using only built-in and available packages
    const nodeScript = `
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';

const inputPath = '${inputPath}';
const outputPath = '${outputPath}';
const lineColor = [${lineColor[0]}, ${lineColor[1]}, ${lineColor[2]}];
const whiteThreshold = ${whiteThreshold};

async function processImage() {
  try {
    // Read the PNG
    const imageBuffer = readFileSync(inputPath);
    
    // Use sharp to process the image
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Extract raw pixel data
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // Process pixels
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if pixel is white (above threshold)
      if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
        // Make transparent
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        if (info.channels === 4) data[i + 3] = 0; // Alpha
      } else {
        // Apply line color
        data[i] = lineColor[0];
        data[i + 1] = lineColor[1];
        data[i + 2] = lineColor[2];
        if (info.channels === 4) data[i + 3] = 255; // Full opacity
      }
    }
    
    // Create output image with alpha channel
    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);
    
    console.log('OK');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

processImage();
`;

    await writeFile(scriptPath, nodeScript);

    // Execute Node.js script
    const { stdout, stderr } = await execFileAsync("node", [scriptPath], { timeout: 30000 });

    if (stderr && !stderr.includes("OK")) {
      console.warn("[PDF Converter] Node script stderr:", stderr);
    }

    if (!stdout.includes("OK")) {
      throw new Error("Node script did not complete successfully");
    }

    // Read output PNG
    const outputBuffer = await readFile(outputPath);
    return outputBuffer;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// POST /api/convert-pdf-overlay
router.post("/convert-pdf-overlay", upload.single("file"), async (req: Request, res: Response) => {
  console.log("[PDF Converter] ── Request received ──");

  try {
    // Auth check
    const user = await getSessionUser(req);
    if (!user) {
      console.log("[PDF Converter] Auth failed — no user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get form fields
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are supported" });
    }

    // Get conversion parameters
    const lineColor = (req.body?.lineColor || "MAPIT_GREEN") as string;
    const whiteThreshold = Math.min(255, Math.max(200, parseInt(req.body?.whiteThreshold || "220", 10)));
    const dpi = Math.min(300, Math.max(150, parseInt(req.body?.dpi || "300", 10)));

    if (!COLOR_PALETTE[lineColor]) {
      return res.status(400).json({
        error: `Invalid color. Supported colors: ${Object.keys(COLOR_PALETTE).join(", ")}`,
      });
    }

    console.log(
      `[PDF Converter] Converting: ${file.originalname} | Color: ${lineColor} | DPI: ${dpi} | Threshold: ${whiteThreshold}`
    );

    // Convert PDF to PNG
    let pngBuffer: Buffer;
    try {
      pngBuffer = await pdfToPng(file.buffer, dpi);
      console.log("[PDF Converter] PDF → PNG conversion successful");
    } catch (err: any) {
      console.error("[PDF Converter] PDF conversion failed:", err?.message);
      return res.status(500).json({ error: "Failed to convert PDF. Please ensure the file is valid." });
    }

    // Process PNG: remove white background and recolor lines
    try {
      pngBuffer = await processPngOverlay(pngBuffer, COLOR_PALETTE[lineColor], whiteThreshold);
      console.log("[PDF Converter] PNG processing successful");
    } catch (err: any) {
      console.error("[PDF Converter] PNG processing failed:", err?.message);
      return res.status(500).json({ error: "Failed to process overlay image." });
    }

    // Upload to storage
    try {
      const filename = `${file.originalname.replace(".pdf", "")}-${lineColor.toLowerCase()}-${nanoid(6)}.png`;
      const storageKey = `overlays/converted/${user.id}/${nanoid()}/${filename}`;

      const { url } = await storagePut(storageKey, pngBuffer, "image/png");

      console.log("[PDF Converter] Upload successful:", url);

      return res.json({
        success: true,
        pngUrl: url,
        filename: filename,
        message: `PDF converted to ${lineColor} overlay successfully`,
      });
    } catch (err: any) {
      console.error("[PDF Converter] Storage upload failed:", err?.message);
      return res.status(500).json({ error: "Failed to upload converted file." });
    }
  } catch (error: any) {
    console.error("[PDF Converter] Unexpected error:", error?.message || error);
    return res.status(500).json({ error: "An unexpected error occurred during conversion." });
  }
});

export default router;
