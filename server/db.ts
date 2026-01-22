import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertMedia, InsertProject, InsertUser, media, projects, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Project CRUD Operations
// ============================================

/**
 * Create a new project for a user
 */
export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(projects).values(project);
  const insertId = result[0].insertId;
  
  // Return the created project
  const created = await db.select().from(projects).where(eq(projects.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get all projects for a specific user
 */
export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get a project by ID, ensuring it belongs to the specified user
 */
export async function getUserProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: number,
  userId: number,
  updates: Partial<Omit<InsertProject, "id" | "userId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify the project belongs to the user
  const existing = await getUserProject(projectId, userId);
  if (!existing) {
    return null;
  }

  await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  // Return the updated project
  return getUserProject(projectId, userId);
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify the project belongs to the user
  const existing = await getUserProject(projectId, userId);
  if (!existing) {
    return false;
  }

  // Delete all media associated with the project first
  await db
    .delete(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId)));

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return true;
}

/**
 * Get project count for a user
 */
export async function getUserProjectCount(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  return result.length;
}

/**
 * Increment project media count
 */
export async function incrementProjectMediaCount(projectId: number, increment: number = 1) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(projects)
    .set({ mediaCount: sql`${projects.mediaCount} + ${increment}` })
    .where(eq(projects.id, projectId));
}

/**
 * Decrement project media count
 */
export async function decrementProjectMediaCount(projectId: number, decrement: number = 1) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(projects)
    .set({ mediaCount: sql`GREATEST(${projects.mediaCount} - ${decrement}, 0)` })
    .where(eq(projects.id, projectId));
}

// ============================================
// Media CRUD Operations
// ============================================

/**
 * Create a new media record
 */
export async function createMedia(mediaItem: InsertMedia) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(media).values(mediaItem);
  const insertId = result[0].insertId;
  
  // Increment the project's media count
  await incrementProjectMediaCount(mediaItem.projectId);
  
  // Return the created media
  const created = await db.select().from(media).where(eq(media.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get all media for a specific project
 */
export async function getProjectMedia(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId)))
    .orderBy(desc(media.createdAt));
}

/**
 * Get a single media item by ID
 */
export async function getMediaById(mediaId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Delete a media item
 */
export async function deleteMedia(mediaId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First get the media to find its project
  const existing = await getMediaById(mediaId, userId);
  if (!existing) {
    return null;
  }

  await db
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.userId, userId)));

  // Decrement the project's media count
  await decrementProjectMediaCount(existing.projectId);

  return existing;
}

/**
 * Delete all media for a project
 */
export async function deleteProjectMedia(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const deleted = await db
    .delete(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId)));

  return deleted;
}

/**
 * Get media count for a project
 */
export async function getProjectMediaCount(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), eq(media.userId, userId)));

  return result.length;
}
