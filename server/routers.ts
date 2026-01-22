import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import ExifParser from "exif-parser";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createMedia,
  createProject,
  deleteMedia,
  deleteProject,
  getMediaById,
  getProjectMedia,
  getUserProject,
  getUserProjectCount,
  getUserProjects,
  updateProject,
} from "./db";
import { storagePut } from "./storage";

// Validation schemas for project operations
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  flightDate: z.date().optional(),
});

const updateProjectSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  clientName: z.string().max(255).nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  flightDate: z.date().nullable().optional(),
  coverImage: z.string().max(500).nullable().optional(),
});

// Helper function to extract EXIF GPS data from image buffer
function extractExifData(buffer: Buffer): {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  capturedAt: Date | null;
  cameraMake: string | null;
  cameraModel: string | null;
} {
  try {
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    const tags = result.tags;

    return {
      latitude: tags.GPSLatitude ?? null,
      longitude: tags.GPSLongitude ?? null,
      altitude: tags.GPSAltitude ?? null,
      capturedAt: tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000) : null,
      cameraMake: tags.Make ?? null,
      cameraModel: tags.Model ?? null,
    };
  } catch (error) {
    console.warn("[EXIF] Failed to parse EXIF data:", error);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      capturedAt: null,
      cameraMake: null,
      cameraModel: null,
    };
  }
}

// Helper to determine media type from MIME type
function getMediaType(mimeType: string): "photo" | "video" {
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "photo";
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Project management procedures
  project: router({
    // List all projects for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjects(ctx.user.id);
    }),

    // Get project count for the current user
    count: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjectCount(ctx.user.id);
    }),

    // Get a single project by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.id, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return project;
      }),

    // Create a new project
    create: protectedProcedure
      .input(createProjectSchema)
      .mutation(async ({ ctx, input }) => {
        const project = await createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          location: input.location ?? null,
          clientName: input.clientName ?? null,
          flightDate: input.flightDate ?? null,
        });
        return project;
      }),

    // Update an existing project
    update: protectedProcedure
      .input(updateProjectSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const project = await updateProject(id, ctx.user.id, updates);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission to update it",
          });
        }
        return project;
      }),

    // Delete a project
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteProject(input.id, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission to delete it",
          });
        }
        return { success: true };
      }),
  }),

  // Media management procedures
  media: router({
    // List all media for a project
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return getProjectMedia(input.projectId, ctx.user.id);
      }),

    // Get a single media item
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }
        return mediaItem;
      }),

    // Upload a new media file
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // Base64 encoded file data
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Extract EXIF data for images
        let exifData = {
          latitude: null as number | null,
          longitude: null as number | null,
          altitude: null as number | null,
          capturedAt: null as Date | null,
          cameraMake: null as string | null,
          cameraModel: null as string | null,
        };

        if (input.mimeType.startsWith("image/")) {
          exifData = extractExifData(buffer);
        }

        // Generate unique file key
        const fileExtension = input.filename.split(".").pop() || "bin";
        const uniqueId = nanoid(12);
        const fileKey = `projects/${input.projectId}/media/${uniqueId}-${input.filename}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Create media record in database
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: exifData.latitude?.toString() ?? null,
          longitude: exifData.longitude?.toString() ?? null,
          altitude: exifData.altitude?.toString() ?? null,
          capturedAt: exifData.capturedAt,
          cameraMake: exifData.cameraMake,
          cameraModel: exifData.cameraModel,
          thumbnailUrl: null, // Could generate thumbnails later
        });

        return mediaItem;
      }),

    // Delete a media item
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteMedia(input.id, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found or you don't have permission to delete it",
          });
        }
        // Note: We're not deleting from S3 here - could add cleanup job later
        return { success: true, deleted };
      }),
  }),
});

export type AppRouter = typeof appRouter;
