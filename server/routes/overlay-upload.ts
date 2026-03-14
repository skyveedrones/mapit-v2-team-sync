/**
 * Overlay Upload Route
 * POST /api/overlay/upload
 *
 * Accepts a multipart form with:
 *   - file: PDF, PNG, or JPG file
 *   - projectId: number
 *
 * If the file is a PDF, it is rendered to a high-resolution PNG using
 * pdf-to-png-converter (pure JS, zero native deps) so that Google Maps
 * can display it as a GroundOverlay raster image.  PNG/JPG files are
 * stored as-is.
 *
 * The resulting image URL and GPS-derived corner coordinates are saved
 * to the project_overlays table.
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { getDb } from "../db";
import { projectOverlays, projects, media } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { sdk } from "../_core/sdk";

const router = Router();

// ── Multer config — store files in memory (max 50 MB) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── Session helper via SDK ────────────────────────────────────────────────
async function getSessionUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch (e) {
    console.error("[Overlay Upload] Auth error:", e);
    return null;
  }
}

// ── Convert PDF buffer to PNG buffer using pdf-to-png-converter ─────────
async function pdfToPng(pdfBuffer: Buffer): Promise<Buffer> {
  // Dynamic import because pdf-to-png-converter is ESM-only
  const { pdfToPng: convert } = await import("pdf-to-png-converter");
  // Convert Buffer to ArrayBuffer for the converter
  const arrayBuffer = pdfBuffer.buffer.slice(
    pdfBuffer.byteOffset,
    pdfBuffer.byteOffset + pdfBuffer.byteLength
  );
  const pages = await convert(arrayBuffer, {
    viewportScale: 2.0,          // 2x scale for good resolution
    pagesToProcess: [1],          // First page only
    disableFontFace: true,
    verbosityLevel: 0,
  });

  if (!pages || pages.length === 0 || !pages[0].content) {
    throw new Error("PDF conversion produced no output");
  }

  return Buffer.from(pages[0].content);
}

// ── Default 4-corner coordinates centred on project GPS data ───────────────
async function getDefaultCoordinates(
  projectId: number
): Promise<[[number, number], [number, number], [number, number], [number, number]]> {
  const db = await getDb();
  if (!db) return [[-97.1, 32.8], [-97.0, 32.8], [-97.0, 32.7], [-97.1, 32.7]];

  const rows = await db
    .select({ lat: media.latitude, lng: media.longitude })
    .from(media)
    .where(and(eq(media.projectId, projectId)))
    .limit(200);

  const valid = rows.filter((r) => r.lat != null && r.lng != null);
  if (valid.length === 0) {
    return [[-97.1, 32.8], [-97.0, 32.8], [-97.0, 32.7], [-97.1, 32.7]];
  }

  // Drizzle returns decimal columns as strings — parse to float
  const lats = valid.map((r) => parseFloat(String(r.lat)));
  const lngs = valid.map((r) => parseFloat(String(r.lng)));

  // Filter out NaN values
  const validLats = lats.filter((v) => !isNaN(v));
  const validLngs = lngs.filter((v) => !isNaN(v));
  if (validLats.length === 0 || validLngs.length === 0) {
    return [[-97.1, 32.8], [-97.0, 32.8], [-97.0, 32.7], [-97.1, 32.7]];
  }

  const minLat = Math.min(...validLats);
  const maxLat = Math.max(...validLats);
  const minLng = Math.min(...validLngs);
  const maxLng = Math.max(...validLngs);

  // Add 10% padding so the overlay extends slightly beyond the markers
  const latPad = (maxLat - minLat) * 0.10 || 0.001;
  const lngPad = (maxLng - minLng) * 0.10 || 0.001;

  // Corner order: TL, TR, BR, BL  —  each as [lng, lat]
  return [
    [minLng - lngPad, maxLat + latPad],
    [maxLng + lngPad, maxLat + latPad],
    [maxLng + lngPad, minLat - latPad],
    [minLng - lngPad, minLat - latPad],
  ];
}

// ── POST /api/overlay/upload ───────────────────────────────────────────────
router.post("/overlay/upload", upload.single("file"), async (req: Request, res: Response) => {
  console.log("[Overlay Upload] ── Request received ──");
  console.log("[Overlay Upload] Content-Type:", req.headers["content-type"]);

  try {
    // Auth check
    const user = await getSessionUser(req);
    if (!user) {
      console.log("[Overlay Upload] Auth failed — no user");
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log("[Overlay Upload] User:", user.id, user.email, "role:", user.role);

    // Role check — only webmaster, admin, and owner-role users may upload overlays
    const allowedRoles = ["webmaster", "admin", "user"];
    if (!allowedRoles.includes(user.role)) {
      console.log("[Overlay Upload] Role rejected:", user.role);
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Get form fields from multer
    const projectId = parseInt(req.body?.projectId, 10);
    console.log("[Overlay Upload] projectId:", projectId, "raw:", req.body?.projectId);

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    console.log("[Overlay Upload] File:", file ? `${file.originalname} (${file.mimetype}, ${file.size} bytes)` : "NONE");

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate file type
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      console.log("[Overlay Upload] Rejected mimetype:", file.mimetype);
      return res.status(400).json({ error: "Only PDF, PNG, and JPG files are supported" });
    }

    // Verify the project exists
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      console.log("[Overlay Upload] Project not found:", projectId);
      return res.status(404).json({ error: "Project not found" });
    }
    if (project.userId !== user.id && user.role !== "webmaster" && user.role !== "admin") {
      return res.status(403).json({ error: "You do not own this project" });
    }

    // ── Convert PDF to PNG if needed ─────────────────────────────────────
    let uploadBuffer: Buffer = file.buffer;
    let uploadMimetype: string = file.mimetype;
    let uploadExt: string = file.originalname.split(".").pop()?.toLowerCase() || "bin";

    if (file.mimetype === "application/pdf") {
      console.log("[Overlay Upload] Converting PDF to PNG via pdf-to-png-converter...");
      try {
        uploadBuffer = await pdfToPng(file.buffer);
        uploadMimetype = "image/png";
        uploadExt = "png";
        console.log("[Overlay Upload] PDF → PNG success, size:", uploadBuffer.length, "bytes");
      } catch (convErr: any) {
        console.error("[Overlay Upload] PDF conversion failed:", convErr?.message || convErr);
        return res.status(500).json({ error: "Failed to convert PDF to image. Please upload a PNG or JPG instead." });
      }
    }

    // Upload file to storage
    const storageKey = `overlays/${user.id}/${projectId}/${nanoid(10)}.${uploadExt}`;
    console.log("[Overlay Upload] Uploading to S3, key:", storageKey);
    const { url: fileUrl } = await storagePut(storageKey, uploadBuffer, uploadMimetype);
    console.log("[Overlay Upload] S3 upload success, url:", fileUrl);

    // Get existing overlay count for version numbering
    const existingOverlays = await db
      .select({ id: projectOverlays.id })
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId));
    const versionNumber = existingOverlays.length + 1;

    // Build default corner coordinates from project GPS data
    const coordinates = await getDefaultCoordinates(projectId);
    console.log("[Overlay Upload] Coordinates:", JSON.stringify(coordinates));

    // Insert overlay record
    await db.insert(projectOverlays).values({
      projectId,
      fileUrl,
      opacity: "0.5",
      coordinates,
      isActive: 1,
      label: `Plan v${versionNumber}`,
      version_number: versionNumber,
    });
    console.log("[Overlay Upload] DB insert success");

    // Fetch the inserted record
    const [inserted] = await db
      .select()
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId))
      .orderBy(projectOverlays.id)
      .limit(1)
      .offset(versionNumber - 1);

    console.log("[Overlay Upload] ✓ Complete — overlay id:", inserted?.id, "url:", fileUrl);
    return res.json({ success: true, overlay: inserted });
  } catch (err: any) {
    console.error("[Overlay Upload] Unhandled error:", err?.message || err);
    console.error("[Overlay Upload] Stack:", err?.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
