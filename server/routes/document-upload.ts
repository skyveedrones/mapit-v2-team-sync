/**
 * Document Upload Route
 * POST /api/document/upload
 *
 * Accepts multipart form with:
 *   - file: any document (PDF, PNG, JPG, DOCX, XLSX, etc.)
 *   - projectId: number
 *
 * Uploads the file to S3 with a sanitized key and saves a row to project_documents.
 * Returns { success, document: { id, fileName, fileKey, fileUrl, fileType } }
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { getDb } from "../db";
import { projectDocuments, projects, projectCollaborators } from "../../drizzle/schema";
import { storagePut, sanitizeFilename } from "../storage";
import { authenticateRequest } from "../_core/auth";
import { eq, and } from "drizzle-orm";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

async function getSessionUser(req: Request) {
  return authenticateRequest(req);
}

router.post("/document/upload", upload.single("file"), async (req: Request, res: Response) => {
  console.log("[Document Upload] Auth check starting...");
  console.log("[Document Upload] Headers:", req.headers);
  const user = await getSessionUser(req);
  console.log("[Document Upload] User result:", user ? `User ID: ${user.id}` : "null");
  if (!user) {
    console.log("[Document Upload] Auth failed - no user");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  console.log("[Document Upload] Auth passed - user:", user.id);

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const projectId = parseInt(req.body.projectId, 10);
  if (!projectId || isNaN(projectId)) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify user has access to this project
    const project = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Check if user is owner, webmaster, or admin
    const isOwner = project[0].userId === user.id;
    const isAdmin = user.role === "webmaster" || user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      // Check if user is a collaborator with editor role
      const collaborator = await db
        .select({ role: projectCollaborators.role })
        .from(projectCollaborators)
        .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, user.id)))
        .limit(1);
      
      if (!collaborator || collaborator.length === 0 || collaborator[0].role !== 'editor') {
        res.status(403).json({ error: "No access to this project" });
        return;
      }
    }

    // Sanitize filename: spaces → hyphens, unsafe chars → underscores
    const safeFileName = sanitizeFilename(file.originalname);
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "bin";
    const fileKey = `projects/${projectId}/documents/${Date.now()}-${safeFileName}`;

    // Upload bytes to S3
    const { url: fileUrl } = await storagePut(fileKey, file.buffer, file.mimetype);

    // Save DB record
    const result = await db.insert(projectDocuments).values({
      projectId,
      fileName: file.originalname,
      fileKey,
      fileType: ext,
      status: "uploaded",
    });

    res.json({
      success: true,
      document: {
        id: (result[0] as any).insertId ?? result[0],
        fileName: file.originalname,
        fileKey,
        fileUrl,
        fileType: ext,
      },
    });
  } catch (err: any) {
    console.error("[Document Upload] Error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
