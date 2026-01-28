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
  createMedia,
  createProject,
  createProjectInvitation,
  deleteMedia,
  deleteProject,
  getInvitationByToken,
  getMediaById,
  getProjectById,
  getProjectCollaborators,
  getProjectInvitations,
  getProjectMedia,
  getProjectMediaWithAccess,
  getProjectWithAccess,
  getUserAccessibleProjects,
  getUserById,
  getUserByEmail,
  getUserProject,
  getUserProjectCount,
  getUserProjects,
  removeProjectCollaborator,
  revokeProjectInvitation,
  updateProject,
  userHasProjectAccess,
} from "./db";
import { sendProjectInvitationEmail } from "./email";
import { storagePut, storageGet } from "./storage";
import { applyWatermark, WatermarkOptions } from "./watermark";

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

  // Watermark procedures
  watermark: router({
    // Apply watermark to a single media item
    applyToMedia: protectedProcedure
      .input(z.object({
        mediaId: z.number(),
        watermarkData: z.string(), // Base64 encoded watermark image
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("bottom-right"),
        opacity: z.number().min(10).max(100).default(70),
        scale: z.number().min(5).max(50).default(15),
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

        // Only process photos
        if (mediaItem.mediaType !== "photo") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Watermarks can only be applied to photos",
          });
        }

        try {
          // Fetch the original image
          const imageResponse = await fetch(mediaItem.url);
          if (!imageResponse.ok) {
            throw new Error("Failed to fetch original image");
          }
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

          // Decode watermark from base64
          const watermarkBuffer = Buffer.from(input.watermarkData, "base64");

          // Apply watermark
          const watermarkedBuffer = await applyWatermark(imageBuffer, watermarkBuffer, {
            position: input.position,
            opacity: input.opacity,
            scale: input.scale,
            padding: 20,
          });

          // Generate new filename
          const timestamp = Date.now();
          const ext = mediaItem.filename.split(".").pop() || "jpg";
          const baseName = mediaItem.filename.replace(/\.[^.]+$/, "");
          const newFilename = `${baseName}_watermarked_${timestamp}.${ext}`;
          const fileKey = `${ctx.user.id}/media/${newFilename}`;

          // Upload watermarked image to S3
          const { url: newUrl } = await storagePut(
            fileKey,
            watermarkedBuffer,
            "image/jpeg"
          );

          return {
            success: true,
            url: newUrl,
            filename: newFilename,
          };
        } catch (error) {
          console.error("[Watermark] Failed to apply watermark:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to apply watermark",
          });
        }
      }),

    // Apply watermark to multiple media items
    applyBatch: protectedProcedure
      .input(z.object({
        mediaIds: z.array(z.number()).min(1).max(50),
        watermarkData: z.string(), // Base64 encoded watermark image
        position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]).default("bottom-right"),
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

            // Generate new filename
            const timestamp = Date.now();
            const ext = mediaItem.filename.split(".").pop() || "jpg";
            const baseName = mediaItem.filename.replace(/\.[^.]+$/, "");
            const newFilename = `${baseName}_watermarked_${timestamp}.${ext}`;
            const fileKey = `${ctx.user.id}/media/${newFilename}`;

            // Upload watermarked image to S3
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
});

export type AppRouter = typeof appRouter;
