import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import ExifParser from "exif-parser";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  acceptProjectInvitation,
  addProjectCollaborator,
  assignMediaToFlight,
  createFlight,
  createMedia,
  createProject,
  createProjectInvitation,
  deleteFlight,
  deleteMedia,
  deleteProject,
  getFlightById,
  getFlightMedia,
  getInvitationByToken,
  getMediaById,
  getProjectById,
  getProjectCollaborators,
  getProjectFlights,
  getProjectInvitations,
  getProjectMedia,
  getProjectMediaWithAccess,
  getProjectUnassignedMedia,
  getProjectWithAccess,
  getUserAccessibleProjects,
  getUserById,
  getUserByEmail,
  getUserFlight,
  getUserProject,
  getUserProjectCount,
  getUserProjects,
  removeProjectCollaborator,
  revokeProjectInvitation,
  updateFlight,
  updateFlightMediaCount,
  updateMediaGPS,
  updateMediaNotes,
  updateProject,
  userHasFlightAccess,
  userHasProjectAccess,
  updateUserLogo,
  deleteUserLogo,
  getUserLogo,
  createWarrantyReminder,
  getProjectWarrantyReminder,
  updateWarrantyReminder,
  deleteWarrantyReminder,
  getDueWarrantyReminders,
  updateProjectWarranty,
  updateMediaUrls,
  updateUserWatermark,
  getUserWatermark,
  deleteUserWatermark,
  updateProjectLogo,
  deleteProjectLogo,
  getProjectLogo,
  // Client functions
  createClient,
  getOwnerClients,
  getClientById,
  getOwnerClient,
  updateClient,
  deleteClient,
  getClientProjects,
  assignProjectToClient,
  userHasClientAccess,
  getUserClientAccess,
  addClientUser,
  removeClientUser,
  getClientUsers,
  createClientInvitation,
  getClientInvitationByToken,
  acceptClientInvitation,
  getClientPendingInvitations,
  revokeClientInvitation,
  userHasClientProjectAccess,
  updateClientLogo,
  deleteClientLogo,
  getClientLogo,
  updateUserPilotSettings,
  getUserPilotSettings,
} from "./db";
import { sendWarrantyReminderEmail, sendProjectInvitationEmail, sendClientInvitationEmail } from "./email";
import { storagePut, storageGet } from "./storage";
import { applyWatermark, WatermarkOptions, generateThumbnail } from "./watermark";
import { applyVideoWatermarkFromBuffers, VideoWatermarkOptions } from "./videoWatermark";

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
  dronePilot: z.string().max(255).nullable().optional(),
  faaLicenseNumber: z.string().max(100).nullable().optional(),
  laancAuthNumber: z.string().max(100).nullable().optional(),
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

// GPS Export format types
type MediaWithGPS = {
  id: number;
  filename: string;
  latitude: string | null;
  longitude: string | null;
  altitude: string | null;
  capturedAt: Date | null;
  mediaType: string;
  url: string;
};

// Helper to generate KML format
function generateKML(projectName: string, media: MediaWithGPS[]): string {
  const gpsMedia = media.filter(m => m.latitude && m.longitude);
  
  const placemarks = gpsMedia.map((m, index) => {
    const lat = parseFloat(m.latitude!);
    const lng = parseFloat(m.longitude!);
    const alt = m.altitude ? parseFloat(m.altitude) : 0;
    const timestamp = m.capturedAt ? new Date(m.capturedAt).toISOString() : '';
    
    return `    <Placemark>
      <name>${escapeXml(m.filename)}</name>
      <description><![CDATA[
        Type: ${m.mediaType}
        ${timestamp ? `Captured: ${timestamp}` : ''}
        Altitude: ${alt}m
      ]]></description>
      <Point>
        <coordinates>${lng},${lat},${alt}</coordinates>
      </Point>
      ${timestamp ? `<TimeStamp><when>${timestamp}</when></TimeStamp>` : ''}
    </Placemark>`;
  }).join('\n');

  // Generate flight path line if multiple points
  let lineString = '';
  if (gpsMedia.length > 1) {
    const coordinates = gpsMedia.map(m => {
      const lat = parseFloat(m.latitude!);
      const lng = parseFloat(m.longitude!);
      const alt = m.altitude ? parseFloat(m.altitude) : 0;
      return `${lng},${lat},${alt}`;
    }).join(' ');

    lineString = `
    <Placemark>
      <name>Flight Path</name>
      <Style>
        <LineStyle>
          <color>ff00ff00</color>
          <width>3</width>
        </LineStyle>
      </Style>
      <LineString>
        <tessellate>1</tessellate>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(projectName)}</name>
    <description>GPS data exported from SkyVee Drone Mapping</description>
    <Style id="dronePoint">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/camera.png</href>
        </Icon>
      </IconStyle>
    </Style>
${placemarks}
${lineString}
  </Document>
</kml>`;
}

// Helper to generate CSV format
function generateCSV(media: MediaWithGPS[]): string {
  const headers = ['filename', 'latitude', 'longitude', 'altitude', 'captured_at', 'media_type', 'url'];
  const rows = media
    .filter(m => m.latitude && m.longitude)
    .map(m => [
      `"${m.filename.replace(/"/g, '""')}"`,
      m.latitude,
      m.longitude,
      m.altitude || '',
      m.capturedAt ? new Date(m.capturedAt).toISOString() : '',
      m.mediaType,
      `"${m.url}"`,
    ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// Helper to generate GeoJSON format
function generateGeoJSON(projectName: string, media: MediaWithGPS[]): string {
  const gpsMedia = media.filter(m => m.latitude && m.longitude);
  
  const features = gpsMedia.map(m => ({
    type: 'Feature',
    properties: {
      name: m.filename,
      mediaType: m.mediaType,
      altitude: m.altitude ? parseFloat(m.altitude) : null,
      capturedAt: m.capturedAt ? new Date(m.capturedAt).toISOString() : null,
      url: m.url,
    },
    geometry: {
      type: 'Point',
      coordinates: [
        parseFloat(m.longitude!),
        parseFloat(m.latitude!),
        m.altitude ? parseFloat(m.altitude) : 0,
      ],
    },
  }));

  // Add flight path as LineString if multiple points
  if (gpsMedia.length > 1) {
    features.push({
      type: 'Feature',
      properties: {
        name: 'Flight Path',
        mediaType: 'path',
        altitude: null,
        capturedAt: null,
        url: '',
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: gpsMedia.map(m => [
          parseFloat(m.longitude!),
          parseFloat(m.latitude!),
          m.altitude ? parseFloat(m.altitude) : 0,
        ]),
      },
    } as any);
  }

  return JSON.stringify({
    type: 'FeatureCollection',
    name: projectName,
    features,
  }, null, 2);
}

// Helper to generate GPX format
function generateGPX(projectName: string, media: MediaWithGPS[]): string {
  const gpsMedia = media.filter(m => m.latitude && m.longitude);
  
  const waypoints = gpsMedia.map(m => {
    const lat = parseFloat(m.latitude!);
    const lng = parseFloat(m.longitude!);
    const alt = m.altitude ? parseFloat(m.altitude) : 0;
    const timestamp = m.capturedAt ? new Date(m.capturedAt).toISOString() : '';
    
    return `  <wpt lat="${lat}" lon="${lng}">
    <ele>${alt}</ele>
    <name>${escapeXml(m.filename)}</name>
    <desc>Type: ${m.mediaType}</desc>
    ${timestamp ? `<time>${timestamp}</time>` : ''}
  </wpt>`;
  }).join('\n');

  // Generate track if multiple points
  let track = '';
  if (gpsMedia.length > 1) {
    const trackpoints = gpsMedia.map(m => {
      const lat = parseFloat(m.latitude!);
      const lng = parseFloat(m.longitude!);
      const alt = m.altitude ? parseFloat(m.altitude) : 0;
      const timestamp = m.capturedAt ? new Date(m.capturedAt).toISOString() : '';
      
      return `      <trkpt lat="${lat}" lon="${lng}">
        <ele>${alt}</ele>
        ${timestamp ? `<time>${timestamp}</time>` : ''}
      </trkpt>`;
    }).join('\n');

    track = `
  <trk>
    <name>Flight Path</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SkyVee Drone Mapping"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(projectName)}</name>
    <desc>GPS data exported from SkyVee Drone Mapping</desc>
  </metadata>
${waypoints}
${track}
</gpx>`;
}

// Helper to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

    // Get a single project by ID (owner or collaborator)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // First check if user is owner
        const ownedProject = await getUserProject(input.id, ctx.user.id);
        if (ownedProject) {
          return { ...ownedProject, accessRole: 'owner' as const };
        }
        
        // Check if user is a collaborator
        const sharedProject = await getProjectWithAccess(input.id, ctx.user.id);
        if (sharedProject) {
          return sharedProject;
        }
        
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
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
    // List all media for a project (owner or collaborator)
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has access (owner or collaborator)
        const hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        
        // Use the access-aware function to get media
        const media = await getProjectMediaWithAccess(input.projectId, ctx.user.id);
        return media || [];
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

    // Upload a chunk of a large file (chunked upload for videos)
    uploadChunk: protectedProcedure
      .input(z.object({
        uploadId: z.string(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
        chunkData: z.string(), // Base64 encoded chunk
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
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

        // Store chunk in temporary storage
        const chunkBuffer = Buffer.from(input.chunkData, "base64");
        const chunkKey = `temp-chunks/${input.uploadId}/chunk-${input.chunkIndex.toString().padStart(5, '0')}`;
        await storagePut(chunkKey, chunkBuffer, "application/octet-stream");

        return { 
          success: true, 
          chunkIndex: input.chunkIndex,
          totalChunks: input.totalChunks 
        };
      }),

    // Finalize chunked upload - combine chunks and create media record
    finalizeChunkedUpload: protectedProcedure
      .input(z.object({
        uploadId: z.string(),
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        thumbnailData: z.string().optional(),
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

        // Generate unique file key for final file
        const uniqueId = nanoid(12);
        const fileKey = `projects/${input.projectId}/media/${uniqueId}-${input.filename}`;

        // Fetch and combine all chunks
        const totalChunks = Math.ceil(input.fileSize / (2 * 1024 * 1024)); // 2MB chunks (must match client)
        const chunks: Buffer[] = [];
        
        for (let i = 0; i < totalChunks; i++) {
          const chunkKey = `temp-chunks/${input.uploadId}/chunk-${i.toString().padStart(5, '0')}`;
          const { url: chunkUrl } = await storageGet(chunkKey);
          const response = await fetch(chunkUrl);
          const arrayBuffer = await response.arrayBuffer();
          chunks.push(Buffer.from(arrayBuffer));
        }

        // Combine chunks
        const combinedBuffer = Buffer.concat(chunks);

        // Upload combined file to S3
        const { url } = await storagePut(fileKey, combinedBuffer, input.mimeType);

        // Upload thumbnail if provided
        let thumbnailUrl: string | null = null;
        if (input.thumbnailData) {
          const thumbnailBuffer = Buffer.from(input.thumbnailData, "base64");
          const thumbnailKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
          const thumbnailResult = await storagePut(thumbnailKey, thumbnailBuffer, "image/jpeg");
          thumbnailUrl = thumbnailResult.url;
        }

        // Create media record in database
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: null,
          longitude: null,
          altitude: null,
          capturedAt: null,
          cameraMake: null,
          cameraModel: null,
          thumbnailUrl,
        });

        return mediaItem;
      }),

    // Upload a new media file (for smaller files - base64 method)
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // Base64 encoded file data
        thumbnailData: z.string().optional(), // Base64 encoded thumbnail for videos
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

        // Upload thumbnail if provided (for videos)
        let thumbnailUrl: string | null = null;
        if (input.thumbnailData) {
          const thumbnailBuffer = Buffer.from(input.thumbnailData, "base64");
          const thumbnailKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
          const thumbnailResult = await storagePut(thumbnailKey, thumbnailBuffer, "image/jpeg");
          thumbnailUrl = thumbnailResult.url;
        }

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
          latitude: (exifData.latitude && !isNaN(exifData.latitude)) ? exifData.latitude.toString() : null,
          longitude: (exifData.longitude && !isNaN(exifData.longitude)) ? exifData.longitude.toString() : null,
          altitude: (exifData.altitude && !isNaN(exifData.altitude)) ? exifData.altitude.toString() : null,
          capturedAt: exifData.capturedAt,
          cameraMake: exifData.cameraMake,
          cameraModel: exifData.cameraModel,
          thumbnailUrl,
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

    // Create media record from URL (used after TUS upload)
    createFromUrl: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        thumbnailUrl: z.string().nullable().optional(),
        thumbnailData: z.string().optional(), // Base64 encoded thumbnail
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

        // Upload thumbnail if provided as base64
        let thumbnailUrl = input.thumbnailUrl || null;
        if (input.thumbnailData && !thumbnailUrl) {
          const thumbnailBuffer = Buffer.from(input.thumbnailData, "base64");
          const uniqueId = nanoid(12);
          const thumbnailKey = `projects/${input.projectId}/thumbnails/${uniqueId}-thumb.jpg`;
          const thumbnailResult = await storagePut(thumbnailKey, thumbnailBuffer, "image/jpeg");
          thumbnailUrl = thumbnailResult.url;
        }

        // Extract file key from URL
        const urlParts = new URL(input.fileUrl);
        const fileKey = urlParts.pathname.replace(/^\//, "");

        // Create media record in database
        const mediaItem = await createMedia({
          projectId: input.projectId,
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url: input.fileUrl,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          mediaType: getMediaType(input.mimeType),
          latitude: null,
          longitude: null,
          altitude: null,
          capturedAt: null,
          cameraMake: null,
          cameraModel: null,
          thumbnailUrl,
        });

        return mediaItem;
      }),

    // Update GPS coordinates for a media item
    updateGPS: protectedProcedure
      .input(z.object({
        id: z.number(),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
        altitude: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Verify user owns the project (not just collaborator)
        const project = await getUserProject(mediaItem.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only project owners can edit GPS coordinates",
          });
        }

        // Update the media item with new GPS coordinates
        const updated = await updateMediaGPS(input.id, {
          latitude: input.latitude?.toString() ?? null,
          longitude: input.longitude?.toString() ?? null,
          altitude: input.altitude?.toString() ?? null,
        });

        return updated;
      }),

    // Update notes for a media item
    updateNotes: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          notes: z.string().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get the media item to verify ownership
        const mediaItem = await getMediaById(input.id, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Verify user has access to the project (owner or collaborator)
        const hasAccess = await userHasProjectAccess(mediaItem.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to edit this media",
          });
        }

        // Update the media item with new notes
        const updated = await updateMediaNotes(input.id, input.notes);

        return updated;
      }),
  }),

  // Project Sharing procedures
  sharing: router({
    // Get project collaborators
    getCollaborators: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }
        return getProjectCollaborators(input.projectId);
      }),

    // Get project invitations
    getInvitations: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }
        return getProjectInvitations(input.projectId);
      }),

    // Send a project invitation
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email(),
        role: z.enum(["viewer", "editor"]).default("viewer"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        // Check if the email belongs to an existing user who is already a collaborator
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          // Check if already a collaborator
          const collaborators = await getProjectCollaborators(input.projectId);
          const isAlreadyCollaborator = collaborators.some(c => c.userId === existingUser.id);
          if (isAlreadyCollaborator) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This user is already a collaborator on this project",
            });
          }
        }

        // Don't allow inviting yourself
        if (input.email.toLowerCase() === ctx.user.email?.toLowerCase()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot invite yourself to your own project",
          });
        }

        // Generate unique token
        const token = nanoid(32);
        
        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create the invitation
        const { invitation, isNew } = await createProjectInvitation({
          projectId: input.projectId,
          invitedBy: ctx.user.id,
          email: input.email.toLowerCase(),
          token,
          role: input.role,
          expiresAt,
        });

        // Build the accept URL
        const baseUrl = process.env.VITE_APP_URL || 'https://skyveemapit.manus.space';
        const acceptUrl = `${baseUrl}/invite/${invitation.token}`;

        // Send the invitation email
        const emailResult = await sendProjectInvitationEmail({
          to: input.email,
          inviterName: ctx.user.name || 'A SkyVee user',
          projectName: project.name,
          role: input.role,
          inviteUrl: acceptUrl,
        });

        if (!emailResult.success) {
          console.error('[Sharing] Failed to send invitation email:', emailResult.error);
          // Don't throw - invitation is still created, just email failed
        }

        return {
          success: true,
          invitation,
          isNew,
          emailSent: emailResult.success,
        };
      }),

    // Accept an invitation (called after user logs in)
    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await acceptProjectInvitation(input.token, ctx.user.id);
        
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to accept invitation",
          });
        }

        // Get the project details to return
        const project = await getProjectById(result.invitation!.projectId);

        return {
          success: true,
          project,
        };
      }),

    // Get invitation details by token (public - for showing invitation info before login)
    getInvitationByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invitation = await getInvitationByToken(input.token);
        
        if (!invitation) {
          return null;
        }

        // Get project details
        const project = await getProjectById(invitation.projectId);
        
        // Get inviter details
        const inviter = await getUserById(invitation.invitedBy);

        return {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
          },
          project: project ? {
            id: project.id,
            name: project.name,
            description: project.description,
          } : null,
          inviter: inviter ? {
            name: inviter.name,
          } : null,
        };
      }),

    // Revoke an invitation
    revokeInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await revokeProjectInvitation(input.invitationId, ctx.user.id);
        
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to revoke invitation",
          });
        }

        return { success: true };
      }),

    // Remove a collaborator
    removeCollaborator: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        const removed = await removeProjectCollaborator(input.projectId, input.userId);
        
        if (!removed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Collaborator not found",
          });
        }

        return { success: true };
      }),

    // Get a shared project (for collaborators)
    getSharedProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectWithAccess(input.projectId, ctx.user.id);
        
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return project;
      }),

    // Get media for a shared project
    getSharedProjectMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const media = await getProjectMediaWithAccess(input.projectId, ctx.user.id);
        
        if (media === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return media;
      }),

    // Get all projects shared with the current user
    getSharedWithMe: protectedProcedure.query(async ({ ctx }) => {
      const { shared } = await getUserAccessibleProjects(ctx.user.id);
      return shared;
    }),
  }),

  // GPS Export procedures
  export: router({
    // Export GPS data as KML
    kml: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const kmlContent = generateKML(project.name, media);
        
        return {
          content: kmlContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.kml`,
          mimeType: 'application/vnd.google-earth.kml+xml',
        };
      }),

    // Export GPS data as CSV
    csv: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const csvContent = generateCSV(media);
        
        return {
          content: csvContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.csv`,
          mimeType: 'text/csv',
        };
      }),

    // Export GPS data as GeoJSON
    geojson: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const geojsonContent = generateGeoJSON(project.name, media);
        
        return {
          content: geojsonContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.geojson`,
          mimeType: 'application/geo+json',
        };
      }),

    // Export GPS data as GPX
    gpx: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const media = await getProjectMedia(input.projectId, ctx.user.id);
        const gpxContent = generateGPX(project.name, media);
        
        return {
          content: gpxContent,
          filename: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_gps.gpx`,
          mimeType: 'application/gpx+xml',
        };
      }),
  }),

  // Flight procedures
  flight: router({
    // Create a new flight within a project
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1, "Flight name is required").max(255),
        description: z.string().max(5000).optional(),
        flightDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        const flight = await createFlight({
          projectId: input.projectId,
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          flightDate: input.flightDate || null,
        });

        return flight;
      }),

    // List all flights for a project
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has access to the project (owner or collaborator)
        const hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return getProjectFlights(input.projectId);
      }),

    // Get a single flight with its media
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const flight = await getFlightById(input.id);
        if (!flight) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found",
          });
        }

        // Check if user has access to the parent project
        const hasAccess = await userHasProjectAccess(flight.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have access",
          });
        }

        const media = await getFlightMedia(input.id);
        return { ...flight, media };
      }),

    // Update a flight
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(5000).nullable().optional(),
        flightDate: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const updated = await updateFlight(id, ctx.user.id, updates);

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have permission",
          });
        }

        return updated;
      }),

    // Delete a flight
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteFlight(input.id, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have permission to delete it",
          });
        }
        return { success: true, deleted };
      }),

    // Get media for a flight
    getMedia: protectedProcedure
      .input(z.object({ flightId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await userHasFlightAccess(input.flightId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flight not found or you don't have access",
          });
        }

        return getFlightMedia(input.flightId);
      }),

    // Get unassigned media for a project (media not in any flight)
    getUnassignedMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        return getProjectUnassignedMedia(input.projectId);
      }),

    // Assign media to a flight
    assignMedia: protectedProcedure
      .input(z.object({
        mediaId: z.number(),
        flightId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get the media item
        const mediaItem = await getMediaById(input.mediaId, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found or you don't have permission",
          });
        }

        // If assigning to a flight, verify the flight exists and belongs to the same project
        if (input.flightId) {
          const flight = await getFlightById(input.flightId);
          if (!flight || flight.projectId !== mediaItem.projectId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid flight or flight doesn't belong to the same project",
            });
          }
        }

        const updated = await assignMediaToFlight(input.mediaId, input.flightId);
        return updated;
      }),

    // Bulk assign media to a flight
    assignMediaBulk: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1),
        flightId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { mediaId: number; success: boolean; error?: string }[] = [];

        for (const mediaId of input.mediaIds) {
          try {
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem) {
              results.push({ mediaId, success: false, error: "Not found" });
              continue;
            }

            if (input.flightId) {
              const flight = await getFlightById(input.flightId);
              if (!flight || flight.projectId !== mediaItem.projectId) {
                results.push({ mediaId, success: false, error: "Invalid flight" });
                continue;
              }
            }

            await assignMediaToFlight(mediaId, input.flightId);
            results.push({ mediaId, success: true });
          } catch (error) {
            results.push({ mediaId, success: false, error: "Failed" });
          }
        }

        // Update flight media count if assigning to a flight
        if (input.flightId) {
          await updateFlightMediaCount(input.flightId);
        }

        return {
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length,
        };
      }),
  }),

  // Watermark procedures
  watermark: router({
    // Get user's saved watermark
    getSavedWatermark: protectedProcedure
      .query(async ({ ctx }) => {
        const watermark = await getUserWatermark(ctx.user.id);
        return watermark;
      }),

    // Save/update user's watermark image
    saveWatermark: protectedProcedure
      .input(z.object({
        watermarkData: z.string(), // Base64 encoded watermark image
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Decode watermark from base64
          const watermarkBuffer = Buffer.from(input.watermarkData, "base64");

          // Generate unique filename
          const timestamp = Date.now();
          const fileKey = `${ctx.user.id}/watermarks/watermark_${timestamp}.png`;

          // Upload watermark to S3
          const { url } = await storagePut(
            fileKey,
            watermarkBuffer,
            "image/png"
          );

          // Update user's watermark in database
          await updateUserWatermark(ctx.user.id, url, fileKey);

          return {
            success: true,
            url,
            fileKey,
          };
        } catch (error) {
          console.error("[Watermark] Failed to save watermark:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save watermark",
          });
        }
      }),

    // Delete user's saved watermark
    deleteWatermark: protectedProcedure
      .mutation(async ({ ctx }) => {
        try {
          await deleteUserWatermark(ctx.user.id);
          return { success: true };
        } catch (error) {
          console.error("[Watermark] Failed to delete watermark:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete watermark",
          });
        }
      }),

    // Apply watermark permanently to selected media (replaces original files)
    applyPermanent: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1).max(50),
        watermarkData: z.string().optional(), // Base64 encoded watermark image (optional if using saved)
        useSavedWatermark: z.boolean().default(false),
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("top-left"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { mediaId: number; success: boolean; error?: string }[] = [];
        
        // Get watermark buffer
        let watermarkBuffer: Buffer;
        
        if (input.useSavedWatermark) {
          // Fetch saved watermark from S3
          const savedWatermark = await getUserWatermark(ctx.user.id);
          if (!savedWatermark?.watermarkUrl) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No saved watermark found. Please upload a watermark first.",
            });
          }
          const wmResponse = await fetch(savedWatermark.watermarkUrl);
          if (!wmResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch saved watermark",
            });
          }
          watermarkBuffer = Buffer.from(await wmResponse.arrayBuffer());
        } else if (input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a watermark image or use saved watermark",
          });
        }

        for (const mediaId of input.mediaIds) {
          try {
            // Get the media item
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem) {
              results.push({ mediaId, success: false, error: "Not found" });
              continue;
            }

            // Only process photos
            if (mediaItem.mediaType !== "photo") {
              results.push({ mediaId, success: false, error: "Not a photo" });
              continue;
            }

            // Fetch the original image
            const imageResponse = await fetch(mediaItem.url);
            if (!imageResponse.ok) {
              results.push({ mediaId, success: false, error: "Failed to fetch" });
              continue;
            }
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Apply watermark to full image
            const watermarkedBuffer = await applyWatermark(imageBuffer, watermarkBuffer, {
              position: input.position,
              opacity: input.opacity,
              scale: input.scale,
              padding: 20,
            });

            // Generate watermarked thumbnail
            const thumbnailBuffer = await generateThumbnail(watermarkedBuffer, 400);

            // Upload watermarked image to S3 (replace original)
            const timestamp = Date.now();
            const ext = mediaItem.filename.split(".").pop() || "jpg";
            const baseName = mediaItem.filename.replace(/\.[^.]+$/, "").replace(/_watermarked_\d+$/, "");
            const newFilename = `${baseName}_wm_${timestamp}.${ext}`;
            const fileKey = `${ctx.user.id}/media/${newFilename}`;
            const thumbnailKey = `${ctx.user.id}/thumbnails/${newFilename}`;

            const { url: newUrl } = await storagePut(
              fileKey,
              watermarkedBuffer,
              "image/jpeg"
            );

            const { url: newThumbnailUrl } = await storagePut(
              thumbnailKey,
              thumbnailBuffer,
              "image/jpeg"
            );

            // Update media record in database with new URLs
            await updateMediaUrls(mediaId, {
              url: newUrl,
              fileKey: fileKey,
              thumbnailUrl: newThumbnailUrl,
            });

            results.push({ mediaId, success: true });
          } catch (error) {
            console.error(`[Watermark] Failed for media ${mediaId}:`, error);
            results.push({ mediaId, success: false, error: "Processing failed" });
          }
        }

        return {
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length,
        };
      }),

    // Apply watermark to video files permanently
    applyVideoWatermark: protectedProcedure
      .input(z.object({
        mediaId: z.number(),
        watermarkData: z.string().optional(), // Base64 encoded watermark image (optional if using saved)
        useSavedWatermark: z.boolean().default(false),
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("top-left"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get watermark buffer
        let watermarkBuffer: Buffer;
        
        if (input.useSavedWatermark) {
          // Fetch saved watermark from S3
          const savedWatermark = await getUserWatermark(ctx.user.id);
          if (!savedWatermark?.watermarkUrl) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No saved watermark found. Please upload a watermark first.",
            });
          }
          const wmResponse = await fetch(savedWatermark.watermarkUrl);
          if (!wmResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch saved watermark",
            });
          }
          watermarkBuffer = Buffer.from(await wmResponse.arrayBuffer());
        } else if (input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a watermark image or use saved watermark",
          });
        }

        // Get the media item
        const mediaItem = await getMediaById(input.mediaId, ctx.user.id);
        if (!mediaItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        // Only process videos
        if (mediaItem.mediaType !== "video") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This media is not a video",
          });
        }

        try {
          // Fetch the original video
          console.log(`[VideoWatermark] Fetching video: ${mediaItem.url}`);
          const videoResponse = await fetch(mediaItem.url);
          if (!videoResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch video",
            });
          }
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          console.log(`[VideoWatermark] Video size: ${Math.round(videoBuffer.length / 1024 / 1024)}MB`);

          // Apply watermark to video
          console.log(`[VideoWatermark] Applying watermark...`);
          const watermarkedBuffer = await applyVideoWatermarkFromBuffers(
            videoBuffer,
            watermarkBuffer,
            {
              position: input.position,
              opacity: input.opacity,
              scale: input.scale,
              padding: 20,
            }
          );
          console.log(`[VideoWatermark] Watermarked video size: ${Math.round(watermarkedBuffer.length / 1024 / 1024)}MB`);

          // Upload watermarked video to S3
          const timestamp = Date.now();
          const ext = mediaItem.filename.split(".").pop() || "mp4";
          const baseName = mediaItem.filename.replace(/\.[^.]+$/, "").replace(/_wm_\d+$/, "");
          const newFilename = `${baseName}_wm_${timestamp}.${ext}`;
          const fileKey = `projects/${mediaItem.projectId}/videos/${newFilename}`;

          console.log(`[VideoWatermark] Uploading to S3: ${fileKey}`);
          const { url: newUrl } = await storagePut(
            fileKey,
            watermarkedBuffer,
            "video/mp4"
          );

          // Update media record in database with new URL
          await updateMediaUrls(input.mediaId, {
            url: newUrl,
            fileKey: fileKey,
          });

          console.log(`[VideoWatermark] Successfully watermarked video: ${newFilename}`);
          return {
            success: true,
            url: newUrl,
            filename: newFilename,
          };
        } catch (error) {
          console.error(`[VideoWatermark] Failed for media ${input.mediaId}:`, error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to watermark video",
          });
        }
      }),

    // Legacy: Apply watermark and return for download (not permanent)
    applyBatch: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1).max(50),
        watermarkData: z.string(), // Base64 encoded watermark image
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("top-left"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { mediaId: number; success: boolean; url?: string; filename?: string; error?: string }[] = [];
        const watermarkBuffer = Buffer.from(input.watermarkData, "base64");

        for (const mediaId of input.mediaIds) {
          try {
            // Get the media item
            const mediaItem = await getMediaById(mediaId, ctx.user.id);
            if (!mediaItem) {
              results.push({ mediaId, success: false, error: "Not found" });
              continue;
            }

            // Only process photos
            if (mediaItem.mediaType !== "photo") {
              results.push({ mediaId, success: false, error: "Not a photo" });
              continue;
            }

            // Fetch the original image
            const imageResponse = await fetch(mediaItem.url);
            if (!imageResponse.ok) {
              results.push({ mediaId, success: false, error: "Failed to fetch" });
              continue;
            }
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Apply watermark
            const watermarkedBuffer = await applyWatermark(imageBuffer, watermarkBuffer, {
              position: input.position,
              opacity: input.opacity,
              scale: input.scale,
              padding: 20,
            });

            // Generate new filename for download
            const timestamp = Date.now();
            const ext = mediaItem.filename.split(".").pop() || "jpg";
            const baseName = mediaItem.filename.replace(/\.[^.]+$/, "");
            const newFilename = `${baseName}_watermarked_${timestamp}.${ext}`;
            const fileKey = `${ctx.user.id}/temp/${newFilename}`;

            // Upload watermarked image to S3 temp folder
            const { url: newUrl } = await storagePut(
              fileKey,
              watermarkedBuffer,
              "image/jpeg"
            );

            results.push({
              mediaId,
              success: true,
              url: newUrl,
              filename: newFilename,
            });
          } catch (error) {
            console.error(`[Watermark] Failed for media ${mediaId}:`, error);
            results.push({ mediaId, success: false, error: "Processing failed" });
          }
        }

        return {
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length,
        };
      }),
  }),

  // Report generation procedures
  report: router({
    // Generate project report
    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        mediaIds: z.array(z.number()),
        resolution: z.enum(["high", "medium", "low", "thumbnail"]).default("medium"),
        mapStyle: z.enum(["roadmap", "satellite", "hybrid", "terrain"]).default("hybrid"),
        showFlightPath: z.boolean().default(true),
        includeWatermark: z.boolean().default(false),
        watermarkData: z.string().optional(),
        watermarkPosition: z.enum(["top-left", "top-right", "center", "bottom-left", "bottom-right"]).default("bottom-right"),
        watermarkOpacity: z.number().min(10).max(100).default(70),
        watermarkScale: z.number().min(5).max(50).default(15),
        userLogoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user has access to the project
        const project = await getProjectWithAccess(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have access",
          });
        }

        // Get selected media
        const allMedia = await getProjectMediaWithAccess(input.projectId, ctx.user.id) || [];
        const selectedMedia = input.mediaIds.length > 0
          ? allMedia.filter(m => input.mediaIds.includes(m.id))
          : allMedia;

        // Import report functions
        const { generateReportHtml, processImageForReport, generateStaticMapUrl, RESOLUTION_PRESETS } = await import("./report");

        // Prepare watermark buffer if needed
        let watermarkBuffer: Buffer | undefined;
        if (input.includeWatermark && input.watermarkData) {
          watermarkBuffer = Buffer.from(input.watermarkData, "base64");
        }

        // Process media images
        const mediaImages: { filename: string; dataUrl: string }[] = [];
        for (const media of selectedMedia) {
          if (media.mediaType !== "photo") continue;

          try {
            // Fetch original image
            const response = await fetch(media.url);
            if (!response.ok) continue;
            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Process image (resize and optionally watermark)
            const processedBuffer = await processImageForReport(
              imageBuffer,
              input.resolution,
              watermarkBuffer ? {
                watermarkBuffer,
                position: input.watermarkPosition,
                opacity: input.watermarkOpacity,
                scale: input.watermarkScale,
              } : undefined
            );

            // Convert to base64 data URL
            const dataUrl = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
            mediaImages.push({ filename: media.filename, dataUrl });
          } catch (error) {
            console.error(`[Report] Failed to process media ${media.id}:`, error);
          }
        }

        // Generate static map image
        let mapImageDataUrl: string | null = null;
        const gpsMedia = selectedMedia.filter(m => m.latitude && m.longitude);
        if (gpsMedia.length > 0) {
          const { fetchStaticMapAsDataUrl } = await import("./report");
          mapImageDataUrl = await fetchStaticMapAsDataUrl(selectedMedia, {
            mapStyle: input.mapStyle,
            showFlightPath: input.showFlightPath,
          });
        }

        // Use project logo if available, otherwise fall back to user-provided logo
        const logoUrl = project.logoUrl || input.userLogoUrl;

        // Generate HTML report
        const html = generateReportHtml(
          project,
          mediaImages,
          mapImageDataUrl,
          new Date(),
          logoUrl
        );

        return {
          html,
          projectName: project.name,
          mediaCount: mediaImages.length,
          resolution: RESOLUTION_PRESETS[input.resolution].label,
        };
      }),

    // Get resolution presets
    getResolutionPresets: publicProcedure.query(async () => {
      const { RESOLUTION_PRESETS } = await import("./report");
      return Object.entries(RESOLUTION_PRESETS).map(([key, value]) => ({
        key,
        ...value,
      }));
    }),

    // Generate PDF from HTML report
    downloadPdf: protectedProcedure
      .input(z.object({
        html: z.string(),
        projectName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generatePdfFromHtml } = await import("./pdfGenerator");
        
        try {
          const pdfBuffer = await generatePdfFromHtml(input.html);
          
          // Return as base64 encoded string
          return {
            pdfData: pdfBuffer.toString("base64"),
            filename: `${input.projectName.replace(/[^a-zA-Z0-9]/g, "_")}_Report_${new Date().toISOString().split("T")[0]}.pdf`,
          };
        } catch (error) {
          console.error("[Report] Failed to generate PDF:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate PDF. Please try again.",
          });
        }
      }),
  }),

  // ==================== Project Logo ====================
  projectLogo: router({
    // Get project logo
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const logo = await getProjectLogo(input.projectId, ctx.user.id);
        return logo;
      }),

    // Upload project logo
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileData: z.string(), // Base64 encoded file data
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate file type
        if (!input.mimeType.startsWith("image/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only image files are allowed for logos",
          });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Check file size (max 5MB for logos)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Logo file size must be less than 5MB",
          });
        }

        // Generate unique file key
        const ext = input.filename.split(".").pop() || "png";
        const fileKey = `projects/${input.projectId}/logo/${nanoid()}.${ext}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Update project record
        const updated = await updateProjectLogo(input.projectId, ctx.user.id, url, fileKey);

        return {
          logoUrl: updated?.logoUrl,
          logoKey: updated?.logoKey,
        };
      }),

    // Delete project logo
    delete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deletedKey = await deleteProjectLogo(input.projectId, ctx.user.id);
        return { success: true, deletedKey };
      }),
  }),

  // ==================== User Logo ====================
  logo: router({
    // Get current user's logo
    get: protectedProcedure.query(async ({ ctx }) => {
      const logo = await getUserLogo(ctx.user.id);
      return logo;
    }),

    // Upload user logo
    upload: protectedProcedure
      .input(z.object({
        fileData: z.string(), // Base64 encoded file data
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate file type
        if (!input.mimeType.startsWith("image/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only image files are allowed for logos",
          });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Check file size (max 5MB for logos)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Logo file size must be less than 5MB",
          });
        }

        // Delete existing logo if present
        const existingLogo = await getUserLogo(ctx.user.id);
        if (existingLogo?.logoKey) {
          // Note: We don't delete from S3 to avoid orphaned files issues
          // The old logo will be replaced
        }

        // Generate unique file key
        const ext = input.filename.split(".").pop() || "png";
        const fileKey = `logos/${ctx.user.id}/${nanoid()}.${ext}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Update user record
        const updated = await updateUserLogo(ctx.user.id, url, fileKey);

        return {
          logoUrl: updated?.logoUrl,
          logoKey: updated?.logoKey,
        };
      }),

    // Delete user logo
    delete: protectedProcedure.mutation(async ({ ctx }) => {
      const deletedKey = await deleteUserLogo(ctx.user.id);
      return { success: true, deletedKey };
    }),
  }),

  // ==================== User Pilot Settings ====================
  pilotSettings: router({
    // Get current user's pilot settings
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserPilotSettings(ctx.user.id);
      return settings;
    }),

    // Update user pilot settings
    update: protectedProcedure
      .input(z.object({
        defaultDronePilot: z.string().max(255).nullable().optional(),
        defaultFaaLicenseNumber: z.string().max(100).nullable().optional(),
        defaultLaancAuthNumber: z.string().max(100).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateUserPilotSettings(ctx.user.id, {
          defaultDronePilot: input.defaultDronePilot,
          defaultFaaLicenseNumber: input.defaultFaaLicenseNumber,
          defaultLaancAuthNumber: input.defaultLaancAuthNumber,
        });
        return {
          success: true,
          defaultDronePilot: updated.defaultDronePilot,
          defaultFaaLicenseNumber: updated.defaultFaaLicenseNumber,
          defaultLaancAuthNumber: updated.defaultLaancAuthNumber,
        };
      }),
  }),

  // Warranty management procedures
  warranty: router({
    // Get warranty reminder for a project
    getReminder: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user has access to project
        const hasAccess = await userHasProjectAccess(input.projectId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        return getProjectWarrantyReminder(input.projectId);
      }),

    // Update project warranty dates
    updateWarrantyDates: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        warrantyStartDate: z.string().nullable(),
        warrantyEndDate: z.string().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        const startDate = input.warrantyStartDate ? new Date(input.warrantyStartDate) : null;
        const endDate = input.warrantyEndDate ? new Date(input.warrantyEndDate) : null;

        await updateProjectWarranty(input.projectId, ctx.user.id, startDate, endDate);
        return { success: true };
      }),

    // Create or update warranty reminder
    saveReminder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        reminderEmail: z.string().email(),
        intervals: z.array(z.number()), // [3, 6, 9] months before expiry
        emailSubject: z.string().optional(),
        emailMessage: z.string().optional(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns the project
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          });
        }

        // Check if warranty dates are set
        if (!project.warrantyEndDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please set warranty dates before configuring reminders",
          });
        }

        // Calculate next reminder date based on intervals
        const warrantyEndDate = new Date(project.warrantyEndDate);
        const now = new Date();
        let nextReminderDate: Date | null = null;

        // Sort intervals in descending order (9, 6, 3)
        const sortedIntervals = [...input.intervals].sort((a, b) => b - a);
        
        for (const monthsBefore of sortedIntervals) {
          const reminderDate = new Date(warrantyEndDate);
          reminderDate.setMonth(reminderDate.getMonth() - monthsBefore);
          
          if (reminderDate > now) {
            nextReminderDate = reminderDate;
          }
        }

        const intervalsJson = JSON.stringify(input.intervals);

        // Check if reminder already exists
        const existingReminder = await getProjectWarrantyReminder(input.projectId);

        if (existingReminder) {
          // Update existing reminder
          await updateWarrantyReminder(existingReminder.id, ctx.user.id, {
            reminderEmail: input.reminderEmail,
            intervals: intervalsJson,
            emailSubject: input.emailSubject || null,
            emailMessage: input.emailMessage || null,
            enabled: input.enabled ? "yes" : "no",
            nextReminderDate,
          });
          return { success: true, id: existingReminder.id };
        } else {
          // Create new reminder
          const id = await createWarrantyReminder({
            projectId: input.projectId,
            userId: ctx.user.id,
            reminderEmail: input.reminderEmail,
            intervals: intervalsJson,
            emailSubject: input.emailSubject,
            emailMessage: input.emailMessage,
            enabled: input.enabled ? "yes" : "no",
            nextReminderDate,
          });
          return { success: true, id };
        }
      }),

    // Delete warranty reminder
    deleteReminder: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reminder = await getProjectWarrantyReminder(input.projectId);
        if (!reminder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Warranty reminder not found",
          });
        }

        await deleteWarrantyReminder(reminder.id, ctx.user.id);
        return { success: true };
      }),

    // Send test reminder email
    sendTestReminder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getUserProject(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        if (!project.warrantyStartDate || !project.warrantyEndDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Warranty dates must be set to send test reminder",
          });
        }

        const warrantyEndDate = new Date(project.warrantyEndDate);
        const now = new Date();
        const monthsRemaining = Math.ceil(
          (warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        const baseUrl = process.env.VITE_APP_URL || "https://skyveedrones.com";
        const projectUrl = `${baseUrl}/project/${project.id}`;

        const result = await sendWarrantyReminderEmail({
          to: input.email,
          projectName: project.name,
          projectLocation: project.location || undefined,
          clientName: project.clientName || undefined,
          warrantyStartDate: new Date(project.warrantyStartDate),
          warrantyEndDate: warrantyEndDate,
          monthsRemaining: Math.max(0, monthsRemaining),
          projectUrl,
        });

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to send test email",
          });
        }

        return { success: true };
      }),

    // Process due reminders (called by scheduled job)
    processDueReminders: protectedProcedure.mutation(async ({ ctx }) => {
      // Only allow admin users to trigger this
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can trigger reminder processing",
        });
      }

      const dueReminders = await getDueWarrantyReminders();
      const results: { projectId: number; success: boolean; error?: string }[] = [];

      for (const { reminder, project, user } of dueReminders) {
        if (!project.warrantyStartDate || !project.warrantyEndDate) continue;

        const warrantyEndDate = new Date(project.warrantyEndDate);
        const now = new Date();
        const monthsRemaining = Math.ceil(
          (warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        const baseUrl = process.env.VITE_APP_URL || "https://skyveedrones.com";
        const projectUrl = `${baseUrl}/project/${project.id}`;

        const result = await sendWarrantyReminderEmail({
          to: reminder.reminderEmail,
          projectName: project.name,
          projectLocation: project.location || undefined,
          clientName: project.clientName || undefined,
          warrantyStartDate: new Date(project.warrantyStartDate),
          warrantyEndDate: warrantyEndDate,
          monthsRemaining: Math.max(0, monthsRemaining),
          customSubject: reminder.emailSubject || undefined,
          customMessage: reminder.emailMessage || undefined,
          projectUrl,
        });

        results.push({
          projectId: project.id,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          // Calculate next reminder date
          const intervals: number[] = JSON.parse(reminder.intervals);
          const sortedIntervals = [...intervals].sort((a, b) => b - a);
          let nextReminderDate: Date | null = null;

          for (const monthsBefore of sortedIntervals) {
            const reminderDate = new Date(warrantyEndDate);
            reminderDate.setMonth(reminderDate.getMonth() - monthsBefore);
            
            if (reminderDate > now) {
              nextReminderDate = reminderDate;
            }
          }

          // Update reminder with last sent time and next reminder date
          await updateWarrantyReminder(reminder.id, reminder.userId, {
            lastSentAt: now,
            nextReminderDate,
          });
        }
      }

      return { processed: results.length, results };
    }),
  }),

  // Client portal management
  clientPortal: router({
    // List all clients for the current user (owner)
    list: protectedProcedure.query(async ({ ctx }) => {
      return getOwnerClients(ctx.user.id);
    }),

    // Get a single client by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.id, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return client;
      }),

    // Create a new client
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Client name is required").max(255),
          contactName: z.string().max(255).optional(),
          contactEmail: z.string().email().optional().or(z.literal("")),
          phone: z.string().max(50).optional(),
          address: z.string().max(500).optional(),
          logoUrl: z.string().max(500).optional(),
          logoKey: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createClient({
          ownerId: ctx.user.id,
          name: input.name,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail || null,
          phone: input.phone || null,
          address: input.address || null,
          logoUrl: input.logoUrl || null,
          logoKey: input.logoKey || null,
        });
      }),

    // Update a client
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          contactName: z.string().max(255).nullable().optional(),
          contactEmail: z.string().email().nullable().optional().or(z.literal("")),
          phone: z.string().max(50).nullable().optional(),
          address: z.string().max(500).nullable().optional(),
          logoUrl: z.string().max(500).nullable().optional(),
          logoKey: z.string().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const client = await updateClient(id, ctx.user.id, updates);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return client;
      }),

    // Delete a client
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteClient(input.id, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return { success: true };
      }),

    // Get client logo
    getLogo: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const logo = await getClientLogo(input.clientId, ctx.user.id);
        return logo;
      }),

    // Upload client logo
    uploadLogo: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        fileData: z.string(), // Base64 encoded file data
        filename: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate file type
        if (!input.mimeType.startsWith("image/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only image files are allowed for logos",
          });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Check file size (max 5MB for logos)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Logo file size must be less than 5MB",
          });
        }

        // Generate unique file key
        const ext = input.filename.split(".").pop() || "png";
        const fileKey = `clients/${input.clientId}/logo/${nanoid()}.${ext}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Update client record
        const updated = await updateClientLogo(input.clientId, ctx.user.id, url, fileKey);

        return {
          logoUrl: updated?.logoUrl,
          logoKey: updated?.logoKey,
        };
      }),

    // Delete client logo
    deleteLogo: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deletedKey = await deleteClientLogo(input.clientId, ctx.user.id);
        return { success: true, deletedKey };
      }),

    // Get projects assigned to a client
    getProjects: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user has access to this client (owner or client user)
        const hasAccess = await userHasClientAccess(input.clientId, ctx.user.id);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this client",
          });
        }
        return getClientProjects(input.clientId);
      }),

    // Assign a project to a client
    assignProject: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          clientId: z.number().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await assignProjectToClient(
          input.projectId,
          input.clientId,
          ctx.user.id
        );
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project or client not found",
          });
        }
        return project;
      }),

    // Get clients the current user has access to (as a client user)
    getMyClientAccess: protectedProcedure.query(async ({ ctx }) => {
      return getUserClientAccess(ctx.user.id);
    }),

    // Get users for a client
    getUsers: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return getClientUsers(input.clientId);
      }),

    // Remove a user from a client
    removeUser: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        await removeClientUser(input.clientId, input.userId);
        return { success: true };
      }),

    // Invite a user to a client
    invite: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          email: z.string().email(),
          role: z.enum(["viewer", "admin"]).default("viewer"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = await createClientInvitation({
          clientId: input.clientId,
          email: input.email,
          role: input.role,
          token,
          invitedBy: ctx.user.id,
          expiresAt,
        });

        // Send invitation email
        const baseUrl = process.env.VITE_APP_URL || 'https://skyveedrones.com';
        const inviteUrl = `${baseUrl}/client-invite/${token}`;
        
        const emailResult = await sendClientInvitationEmail({
          to: input.email,
          inviterName: ctx.user.name || 'SkyVee User',
          clientName: client.name,
          role: input.role,
          inviteUrl,
        });

        if (!emailResult.success) {
          console.error('[Client Invite] Failed to send email:', emailResult.error);
          // Still return success since invitation was created
        }

        return {
          invitation,
          inviteUrl,
          emailSent: emailResult.success,
        };
      }),

    // Accept a client invitation
    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await acceptClientInvitation(input.token, ctx.user.id);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to accept invitation",
          });
        }
        return result;
      }),

    // Get pending invitations for a client
    getPendingInvitations: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        return getClientPendingInvitations(input.clientId);
      }),

    // Revoke a client invitation
    revokeInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await revokeClientInvitation(input.invitationId, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found",
          });
        }
        return { success: true };
      }),

    // Assign multiple projects to a client
    assignProjects: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          projectIds: z.array(z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this client
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        // Assign each project
        const results = [];
        for (const projectId of input.projectIds) {
          const project = await assignProjectToClient(projectId, input.clientId, ctx.user.id);
          if (project) {
            results.push(project);
          }
        }
        return results;
      }),

    // Unassign a project from a client
    unassignProject: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          projectId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this client
        const client = await getOwnerClient(input.clientId, ctx.user.id);
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        // Unassign by setting clientId to null
        const project = await assignProjectToClient(input.projectId, null, ctx.user.id);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return { success: true };
      }),

    // Get client portal data for the current user (client user view)
    getMyPortal: protectedProcedure.query(async ({ ctx }) => {
      // Get all clients this user has access to
      const clientAccess = await getUserClientAccess(ctx.user.id);
      
      // For each client, get their assigned projects
      const clientsWithProjects = await Promise.all(
        clientAccess.map(async (access) => {
          const projects = await getClientProjects(access.client.id);
          return {
            client: access.client,
            role: access.role,
            projects,
          };
        })
      );
      
      return { clients: clientsWithProjects };
    }),

    // Get a specific project for client portal view (read-only)
    getPortalProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has client access to this project
        const hasAccess = await userHasClientProjectAccess(ctx.user.id, input.projectId);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        
        const project = await getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        
        return project;
      }),

    // Get client invitation details by token (public - for showing invitation info before login)
    getInvitationByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invitationData = await getClientInvitationByToken(input.token);
        
        if (!invitationData) {
          return null;
        }

        const { invitation, client } = invitationData;
        
        // Get inviter details
        const inviter = await getUserById(invitation.invitedBy);

        return {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
          },
          client: {
            id: client.id,
            name: client.name,
            logoUrl: client.logoUrl,
          },
          inviter: inviter ? {
            id: inviter.id,
            name: inviter.name,
          } : null,
        };
      }),

    // Get media for a project in client portal (read-only)
    getPortalProjectMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has client access to this project
        const hasAccess = await userHasClientProjectAccess(ctx.user.id, input.projectId);
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
        
        // Use 0 as userId since we already verified client access above
        // The getProjectMedia function requires userId but we've already authorized via client access
        const project = await getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        return getProjectMedia(input.projectId, project.userId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
