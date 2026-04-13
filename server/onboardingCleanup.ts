/**
 * Onboarding Trial Project Cleanup
 *
 * Runs every hour and hard-deletes unclaimed trial projects (those created via
 * the "Start Mapping Free" onboarding funnel) that are older than 48 hours.
 *
 * A trial project is identified by:
 *   description = 'Created via onboarding funnel — trial project'
 *
 * Once a user claims a project (by signing up), the project's userId is updated
 * to the new user's ID and the description is cleared, so it will no longer be
 * matched by this cleanup job.
 */

import { and, eq, lt, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { projects, media } from "../drizzle/schema";

const TRIAL_DESCRIPTION = "Created via onboarding funnel — trial project";
const EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function cleanupExpiredTrialProjects(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[TrialCleanup] Database not available, skipping cleanup");
    return;
  }

  const cutoff = new Date(Date.now() - EXPIRY_MS);
  // MySQL timestamp format: 'YYYY-MM-DD HH:MM:SS'
  const cutoffStr = cutoff.toISOString().replace("T", " ").substring(0, 19);

  try {
    // Find expired trial projects
    const expiredProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.description, TRIAL_DESCRIPTION),
          lt(projects.createdAt, cutoffStr)
        )
      );

    if (expiredProjects.length === 0) {
      return;
    }

    console.log(
      `[TrialCleanup] Found ${expiredProjects.length} expired trial project(s) to delete`
    );

    for (const project of expiredProjects) {
      try {
        // Delete associated media first
        await db.delete(media).where(eq(media.projectId, project.id));

        // Delete the project
        await db.delete(projects).where(eq(projects.id, project.id));

        console.log(`[TrialCleanup] Deleted expired trial project ${project.id}`);
      } catch (err) {
        console.error(
          `[TrialCleanup] Failed to delete trial project ${project.id}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[TrialCleanup] Cleanup job error:", err);
  }
}

export function startTrialCleanupJob(): void {
  console.log(
    `[TrialCleanup] Scheduled cleanup job started (runs every ${CLEANUP_INTERVAL_MS / 60000} minutes, deletes projects older than ${EXPIRY_MS / 3600000}h)`
  );

  // Run once at startup (with a short delay to let the DB connect)
  setTimeout(() => {
    cleanupExpiredTrialProjects().catch((err) =>
      console.error("[TrialCleanup] Initial run error:", err)
    );
  }, 30_000);

  // Then run every hour
  setInterval(() => {
    cleanupExpiredTrialProjects().catch((err) =>
      console.error("[TrialCleanup] Periodic run error:", err)
    );
  }, CLEANUP_INTERVAL_MS);
}
