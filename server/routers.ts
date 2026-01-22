import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createProject,
  deleteProject,
  getUserProject,
  getUserProjectCount,
  getUserProjects,
  updateProject,
} from "./db";

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
});

export type AppRouter = typeof appRouter;
