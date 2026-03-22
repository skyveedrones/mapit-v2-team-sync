import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { organizations, users, projects, media, clients } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Admin/Webmaster Router
 * Provides sitewide data access for webmaster role users
 * All procedures require webmaster role verification
 */

const webmasterOnly = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'webmaster') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only webmasters can access admin dashboard',
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /**
   * Get all clients
   */
  getAllClients: webmasterOnly.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
    
    // Get owner names for each client
    const enrichedClients = await Promise.all(
      allClients.map(async (client) => {
        let ownerName = 'N/A';
        if (client.ownerId) {
          const owner = await db.select().from(users).where(eq(users.id, client.ownerId)).limit(1);
          if (owner.length > 0) {
            ownerName = owner[0].name || 'Unknown';
          }
        }
        
        return {
          id: client.id,
          name: client.name,
          contactEmail: client.contactEmail,
          contactName: client.contactName,
          ownerName: ownerName,
          projectCount: client.projectCount,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        };
      })
    );

    return enrichedClients;
  }),

  /**
   * Get all organizations with user counts and project counts
   */
  getAllOrganizations: webmasterOnly.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const allOrgs = await db.select().from(organizations);
    
    // Get user and project counts for each org
    const enrichedOrgs = await Promise.all(
      allOrgs.map(async (org) => {
        const userCount = await db.select().from(users).where(eq(users.organizationId, org.id));
        const projectCount = await db.select().from(projects).where(eq(projects.organizationId, org.id));
        
        return {
          id: org.id,
          name: org.name,
          type: org.type,
          userCount: userCount.length,
          projectCount: projectCount.length,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        };
      })
    );

    return enrichedOrgs;
  }),

  /**
   * Get all users across all organizations
   */
  getAllUsers: webmasterOnly.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    
    // Get organization names for each user
    const enrichedUsers = await Promise.all(
      allUsers.map(async (user) => {
        let orgName = 'N/A';
        if (user.organizationId) {
          const org = await db.select().from(organizations).where(eq(organizations.id, user.organizationId)).limit(1);
          if (org.length > 0) {
            orgName = org[0].name;
          }
        }
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationName: orgName,
          loginMethod: user.loginMethod,
          createdAt: user.createdAt,
          lastSignedIn: user.lastSignedIn,
        };
      })
    );

    return enrichedUsers;
  }),

  /**
   * Get all projects across all organizations
   */
  getAllProjects: webmasterOnly.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    
    // Get organization names and media counts for each project
    const enrichedProjects = await Promise.all(
      allProjects.map(async (project) => {
        let orgName = 'N/A';
        if (project.organizationId) {
          const org = await db.select().from(organizations).where(eq(organizations.id, project.organizationId)).limit(1);
          if (org.length > 0) {
            orgName = org[0].name;
          }
        }
        
        const mediaCount = await db.select().from(media).where(eq(media.projectId, project.id));
        
        return {
          id: project.id,
          name: project.name,
          organizationName: orgName,
          mediaCount: mediaCount.length,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      })
    );

    return enrichedProjects;
  }),

  /**
   * Get organization details with all users and projects
   */
  getOrganizationDetails: webmasterOnly
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const org = await db.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
      
      if (org.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      const orgUsers = await db.select().from(users).where(eq(users.organizationId, input.organizationId));
      const orgProjects = await db.select().from(projects).where(eq(projects.organizationId, input.organizationId));
      
      // Get media counts for each project
      const projectsWithMediaCount = await Promise.all(
        orgProjects.map(async (project) => {
          const projectMedia = await db.select().from(media).where(eq(media.projectId, project.id));
          return {
            ...project,
            mediaCount: projectMedia.length,
          };
        })
      );

      return {
        ...org[0],
        users: orgUsers,
        projects: projectsWithMediaCount,
        userCount: orgUsers.length,
        projectCount: orgProjects.length,
      };
    }),

  /**
   * Get project details with all media
   */
  getProjectDetails: webmasterOnly
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const project = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
      
      if (project.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      let orgName = 'N/A';
      if (project[0].organizationId) {
        const org = await db.select().from(organizations).where(eq(organizations.id, project[0].organizationId)).limit(1);
        if (org.length > 0) {
          orgName = org[0].name;
        }
      }
      
      const projectMedia = await db.select().from(media).where(eq(media.projectId, input.projectId)).orderBy(desc(media.createdAt));

      return {
        ...project[0],
        organizationName: orgName,
        media: projectMedia,
        mediaCount: projectMedia.length,
      };
    }),

  /**
   * Get dashboard statistics
   */
  getDashboardStats: webmasterOnly.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const orgCount = await db.select().from(organizations);
    const userCount = await db.select().from(users);
    const projectCount = await db.select().from(projects);
    const mediaCount = await db.select().from(media);

    return {
      totalOrganizations: orgCount.length,
      totalUsers: userCount.length,
      totalProjects: projectCount.length,
      totalMedia: mediaCount.length,
    };
  }),
});
