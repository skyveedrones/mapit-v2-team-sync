import { Router, Request, Response } from "express";
import multer from "multer";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, rm } from "fs/promises";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);
const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Color palette for overlays
const COLOR_PALETTE: Record<string, [number, number, number]> = {
  MAPIT_GREEN: [0, 255, 136],
  SAFETY_ORANGE: [255, 121, 0],
  ELECTRIC_BLUE: [0, 191, 255],
  HOT_PINK: [255, 0, 255],
  HI_VIZ_YELLOW: [255, 255, 0],
};

// Convert RGB to hex for ImageMagick
function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Process PDF using ImageMagick
async function convertPdfToOverlay(
  pdfBuffer: Buffer,
  lineColor: [number, number, number],
  whiteThreshold: number,
  dpi: number
): Promise<Buffer> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pdf-convert-"));
  const inputPath = join(tmpDir, "input.pdf");
  const outputPath = join(tmpDir, "output.png");

  try {
    // Write input PDF
    await writeFile(inputPath, pdfBuffer);

    // Convert hex color for ImageMagick
    const hexColor = rgbToHex(lineColor[0], lineColor[1], lineColor[2]);
    
    // Calculate fuzz percentage for white threshold (0-100)
    // whiteThreshold is 0-255, convert to percentage
    const fuzzPercent = Math.round(((255 - whiteThreshold) / 255) * 15); // 0-15% fuzz

    console.log(`[PDF Converter] Using ImageMagick with color ${hexColor}, fuzz ${fuzzPercent}%, DPI ${dpi}`);

    // Use ImageMagick convert to process PDF
    // This command:
    // 1. Reads first page of PDF at specified DPI
    // 2. Makes white/near-white pixels transparent (with fuzz tolerance)
    // 3. Changes black/dark pixels to the selected color
    // 4. Ensures alpha channel is set for transparency
    await execFileAsync("convert", [
      `${inputPath}[0]`, // First page only
      `-density`, dpi.toString(),
      `-fuzz`, `${fuzzPercent}%`,
      `-transparent`, "white",
      `-fill`, hexColor,
      `-opaque`, "black",
      `-alpha`, "set",
      outputPath,
    ]);

    console.log("[PDF Converter] ImageMagick conversion successful");

    // Read output PNG
    const outputBuffer = await readFile(outputPath);
    return outputBuffer;
  } catch (error) {
    console.error("[PDF Converter] ImageMagick conversion failed:", error);
    throw new Error("PDF conversion failed");
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// POST /api/convert-pdf-overlay
router.post("/convert-pdf-overlay", upload.single("file"), async (req: Request, res: Response) => {
  console.log("[PDF Converter] ── Request received ──");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { color = "MAPIT_GREEN", whiteThreshold = 220, dpi = 300 } = req.body;

    console.log(`[PDF Converter] Converting: ${req.file.originalname} | Color: ${color} | DPI: ${dpi} | Threshold: ${whiteThreshold}`);

    // Get color from palette
    const lineColor = COLOR_PALETTE[color] || COLOR_PALETTE.MAPIT_GREEN;

    // Convert PDF to PNG overlay
    const pngBuffer = await convertPdfToOverlay(
      req.file.buffer,
      lineColor,
      parseInt(whiteThreshold),
      parseInt(dpi)
    );

    // Return PNG as response
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${req.file.originalname.replace(".pdf", ".png")}"`);
    res.send(pngBuffer);
  } catch (error) {
    console.error("[PDF Converter] Error:", error);
    res.status(500).json({ error: "Conversion failed" });
  }
});

export default router;
