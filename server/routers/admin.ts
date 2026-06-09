import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { organizations, users, projects, media, clients } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import { sendEmail } from '../_core/email';

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
   * List organizations - for webmasters and org admins
   */
  listOrganizations: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Webmasters can see all organizations
      if (ctx.user.role === 'webmaster') {
        const allOrgs = await db.select().from(organizations);
        
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
      }
      
      // Org admins can only see their own organization
      if (ctx.user.orgRole === 'ORG_ADMIN' && ctx.user.organizationId) {
        const org = await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId)).limit(1);
        
        if (org.length === 0) {
          return [];
        }
        
        const userCount = await db.select().from(users).where(eq(users.organizationId, org[0].id));
        const projectCount = await db.select().from(projects).where(eq(projects.organizationId, org[0].id));
        
        return [{
          id: org[0].id,
          name: org[0].name,
          type: org[0].type,
          userCount: userCount.length,
          projectCount: projectCount.length,
          createdAt: org[0].createdAt,
          updatedAt: org[0].updatedAt,
        }];
      }
      
      return [];
    }),

  /**
   * Get organization details with all users and projects
   */
  getOrganizationDetails: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Check access: webmaster or org admin for their own organization
      const isWebmaster = ctx.user.role === 'webmaster';
      const isOrgAdmin = ctx.user.orgRole === 'ORG_ADMIN' && ctx.user.organizationId === input.organizationId;
      
      if (!isWebmaster && !isOrgAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this organization',
        });
      }
      
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
  /**
   * Reset a user's password
   */
  resetUserPassword: webmasterOnly
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const passwordHash = await bcryptjs.hash(input.newPassword, 10);
      await db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, input.userId));
      // Fetch user and send password reset email
      const [targetUser] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser?.email) {
        await sendEmail({
          to: targetUser.email,
          subject: 'Your MAPIT Password Has Been Reset',
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Inter,-apple-system,sans-serif;background-color:#09323B;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="max-width:600px;width:100%;background-color:#0a1f26;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#117660 0%,#04B16F 100%);padding:40px 30px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:2px;">MAP<span style="color:#14E114;">i</span>T</h1>
          <p style="margin:10px 0 0 0;color:#e0f2f1;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Drone Mapping Platform</p>
        </td></tr>
        <tr><td style="padding:40px 30px;color:#e0e0e0;">
          <h2 style="margin:0 0 20px 0;color:#04B16F;font-size:24px;font-weight:600;">Password Reset</h2>
          <p style="margin:0 0 20px 0;line-height:1.6;font-size:16px;color:#b0b0b0;">Hi ${targetUser.name || 'there'},</p>
          <p style="margin:0 0 20px 0;line-height:1.6;font-size:16px;color:#b0b0b0;">Your MAPIT password has been reset by an administrator. Use the temporary password below to log in, then change it from your account settings.</p>
          <div style="background-color:#051419;border:1px solid #117660;border-radius:8px;padding:20px;margin:0 0 30px 0;">
            <p style="margin:0 0 10px 0;font-size:12px;text-transform:uppercase;color:#04B16F;font-weight:600;letter-spacing:1px;">Your Temporary Password</p>
            <p style="margin:0;font-size:20px;font-family:'Courier New',monospace;color:#ffffff;font-weight:600;letter-spacing:2px;word-break:break-all;">${input.newPassword}</p>
            <p style="margin:10px 0 0 0;font-size:12px;color:#999;">Please change this password after logging in.</p>
          </div>
          <table role="presentation" style="width:100%;margin:0 0 30px 0;">
            <tr><td align="center">
              <a href="https://mapit.skyveedrones.com/login" style="display:inline-block;background:linear-gradient(135deg,#117660 0%,#04B16F 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:6px;font-weight:600;font-size:16px;">Log In to MAPIT</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0 0;padding-top:20px;border-top:1px solid #333;font-size:12px;color:#666;line-height:1.5;">If you did not expect this reset, contact your administrator immediately.<br><br>&copy; 2026 MAPIT. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      }
      return { success: true };
    }),

  /**
   * Update a user's details (name, email, subscriptionTier, role)
   */
  updateUserDetails: webmasterOnly
    .input(z.object({
      userId: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      subscriptionTier: z.enum(['free','starter','professional','business','enterprise']).optional(),
      role: z.enum(['user','admin','webmaster']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { userId, ...updates } = input;
      await db.update(users).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
      return { success: true };
    }),

  /**
   * Delete a user
   */
  deleteUser: webmasterOnly
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      await db.delete(users).where(eq(users.id, input.userId));
      return { success: true };
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
