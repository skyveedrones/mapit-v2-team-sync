/**
 * Create Overlay Route
 * POST /api/create-overlay
 *
 * Accepts JSON with:
 *   - projectId: number
 *   - fileUrl: string (S3 URL)
 *   - label: string (optional overlay name)
 *
 * Creates a new project overlay record with default coordinates
 * centered on the project location.
 */

import express, { Router, Request, Response } from "express";
import { getDb } from "../db";
import { projectOverlays, projects, media } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { authenticateRequest } from "../_core/auth";

const router = Router();

// Session helper via Clerk
async function getSessionUser(req: Request) {
  return authenticateRequest(req);
}

// Get default coordinates for project (centered on first media item or project center)
async function getDefaultCoordinates(projectId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Try to get coordinates from first media item with GPS data
  const mediaItems = await db
    .select({ latitude: media.latitude, longitude: media.longitude })
    .from(media)
    .where(and(eq(media.projectId, projectId), eq(media.mediaType, "photo")))
    .limit(1);

  let lat = 32.7767; // Default: Dallas, TX
  let lng = -96.797;

  if (mediaItems && mediaItems.length > 0 && mediaItems[0].latitude && mediaItems[0].longitude) {
    lat = parseFloat(mediaItems[0].latitude as any);
    lng = parseFloat(mediaItems[0].longitude as any);
  }

  // Create a 4-point bounding box centered on location
  // Default size: ~500m x 500m
  const offsetLat = 0.0045; // ~500m in degrees
  const offsetLng = 0.0045;

  return [
    [lng - offsetLng, lat + offsetLat], // Top-left
    [lng + offsetLng, lat + offsetLat], // Top-right
    [lng + offsetLng, lat - offsetLat], // Bottom-right
    [lng - offsetLng, lat - offsetLat], // Bottom-left
  ];
}

// POST /api/create-overlay
router.post("/create-overlay", async (req: Request, res: Response) => {
  console.log("[Create Overlay] ── Request received ──");

  try {
    // Auth check
    const user = await getSessionUser(req);
    if (!user) {
      console.log("[Create Overlay] Auth failed — no user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId, fileUrl, label } = req.body;

    if (!projectId || !fileUrl) {
      return res.status(400).json({ error: "Missing projectId or fileUrl" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    // Verify user has access to this project
    const project = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project[0].userId !== user.id && user.role !== "webmaster" && user.role !== "admin") {
      return res.status(403).json({ error: "No access to this project" });
    }

    // Get default coordinates
    const coordinates = await getDefaultCoordinates(projectId);

    // Get version number
    const existingOverlays = await db
      .select({ id: projectOverlays.id })
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId));

    const versionNumber = existingOverlays.length + 1;

    // Insert overlay record
    await db.insert(projectOverlays).values({
      projectId,
      fileUrl,
      opacity: "0.5",
      coordinates,
      originalCoordinates: coordinates,
      isActive: 1,
      label: label || `Plan v${versionNumber}`,
      version_number: versionNumber,
    } as any);

    console.log("[Create Overlay] DB insert success");

    // Fetch the inserted record
    const [inserted] = await db
      .select()
      .from(projectOverlays)
      .where(eq(projectOverlays.projectId, projectId))
      .orderBy(projectOverlays.id)
      .limit(1)
      .offset(versionNumber - 1);

    console.log("[Create Overlay] ✓ Complete — overlay id:", inserted?.id);

    return res.json({ success: true, overlay: inserted });
  } catch (error: any) {
    console.error("[Create Overlay] Error:", error?.message || error);
    return res.status(500).json({ error: "Failed to create overlay" });
  }
});

export default router;
