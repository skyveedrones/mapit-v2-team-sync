import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertMedia, InsertProject, InsertProjectCollaborator, InsertProjectInvitation, InsertUser, media, projectCollaborators, projectInvitations, projects, users } from "../drizzle/schema";
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
 * Update GPS coordinates for a media item
 */
export async function updateMediaGPS(
  mediaId: number,
  gpsData: {
    latitude: string | null;
    longitude: string | null;
    altitude: string | null;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(media)
    .set({
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      altitude: gpsData.altitude,
      updatedAt: new Date(),
    })
    .where(eq(media.id, mediaId));

  // Return the updated media item
  const [updated] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId));

  return updated;
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

// ============================================
// Project Collaborators & Invitations
// ============================================

/**
 * Check if a user has access to a project (owner or collaborator)
 */
export async function userHasProjectAccess(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if user is the owner
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (project.length > 0) {
    return true;
  }

  // Check if user is a collaborator
  const collaborator = await db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId)))
    .limit(1);

  return collaborator.length > 0;
}

/**
 * Get a project with access check (owner or collaborator)
 */
export async function getProjectWithAccess(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project.length === 0) {
    return null;
  }

  // Check if user is owner
  if (project[0].userId === userId) {
    return { ...project[0], accessRole: 'owner' as const };
  }

  // Check if user is collaborator
  const collaborator = await db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId)))
    .limit(1);

  if (collaborator.length > 0) {
    return { ...project[0], accessRole: collaborator[0].role };
  }

  return null;
}

/**
 * Get all projects a user has access to (owned + shared)
 */
export async function getUserAccessibleProjects(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get owned projects
  const ownedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));

  // Get shared projects
  const sharedProjectIds = await db
    .select({ projectId: projectCollaborators.projectId, role: projectCollaborators.role })
    .from(projectCollaborators)
    .where(eq(projectCollaborators.userId, userId));

  const sharedProjects = [];
  for (const collab of sharedProjectIds) {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, collab.projectId))
      .limit(1);
    if (project.length > 0) {
      sharedProjects.push({ ...project[0], sharedRole: collab.role });
    }
  }

  return {
    owned: ownedProjects,
    shared: sharedProjects,
  };
}

/**
 * Add a collaborator to a project
 */
export async function addProjectCollaborator(collaborator: InsertProjectCollaborator) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if collaborator already exists
  const existing = await db
    .select()
    .from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, collaborator.projectId),
      eq(projectCollaborators.userId, collaborator.userId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(projectCollaborators).values(collaborator);
  const insertId = result[0].insertId;

  const created = await db
    .select()
    .from(projectCollaborators)
    .where(eq(projectCollaborators.id, insertId))
    .limit(1);

  return created[0];
}

/**
 * Remove a collaborator from a project
 */
export async function removeProjectCollaborator(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db
    .select()
    .from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId)
    ))
    .limit(1);

  if (existing.length === 0) {
    return null;
  }

  await db
    .delete(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId)
    ));

  return existing[0];
}

/**
 * Get all collaborators for a project
 */
export async function getProjectCollaborators(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const collaborators = await db
    .select({
      id: projectCollaborators.id,
      projectId: projectCollaborators.projectId,
      userId: projectCollaborators.userId,
      role: projectCollaborators.role,
      createdAt: projectCollaborators.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(projectCollaborators.userId, users.id))
    .where(eq(projectCollaborators.projectId, projectId));

  return collaborators;
}

/**
 * Create a project invitation
 */
export async function createProjectInvitation(invitation: InsertProjectInvitation) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if there's already a pending invitation for this email
  const existing = await db
    .select()
    .from(projectInvitations)
    .where(and(
      eq(projectInvitations.projectId, invitation.projectId),
      eq(projectInvitations.email, invitation.email),
      eq(projectInvitations.status, 'pending')
    ))
    .limit(1);

  if (existing.length > 0) {
    return { invitation: existing[0], isNew: false };
  }

  const result = await db.insert(projectInvitations).values(invitation);
  const insertId = result[0].insertId;

  const created = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, insertId))
    .limit(1);

  return { invitation: created[0], isNew: true };
}

/**
 * Get a project invitation by token
 */
export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.token, token))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Accept a project invitation
 */
export async function acceptProjectInvitation(token: string, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get the invitation
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `Invitation has already been ${invitation.status}` };
  }

  if (new Date() > invitation.expiresAt) {
    // Update status to expired
    await db
      .update(projectInvitations)
      .set({ status: 'expired' })
      .where(eq(projectInvitations.id, invitation.id));
    return { success: false, error: 'Invitation has expired' };
  }

  // Add user as collaborator
  await addProjectCollaborator({
    projectId: invitation.projectId,
    userId: userId,
    role: invitation.role,
  });

  // Update invitation status
  await db
    .update(projectInvitations)
    .set({ status: 'accepted', acceptedAt: new Date() })
    .where(eq(projectInvitations.id, invitation.id));

  return { success: true, invitation };
}

/**
 * Revoke a project invitation
 */
export async function revokeProjectInvitation(invitationId: number, projectOwnerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get the invitation and verify ownership
  const invitation = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, invitationId))
    .limit(1);

  if (invitation.length === 0) {
    return { success: false, error: 'Invitation not found' };
  }

  // Verify the project belongs to the user
  const project = await getUserProject(invitation[0].projectId, projectOwnerId);
  if (!project) {
    return { success: false, error: 'Not authorized to revoke this invitation' };
  }

  if (invitation[0].status !== 'pending') {
    return { success: false, error: 'Can only revoke pending invitations' };
  }

  await db
    .update(projectInvitations)
    .set({ status: 'revoked' })
    .where(eq(projectInvitations.id, invitationId));

  return { success: true };
}

/**
 * Get all invitations for a project
 */
export async function getProjectInvitations(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.projectId, projectId))
    .orderBy(desc(projectInvitations.createdAt));
}

/**
 * Get pending invitations for an email address
 */
export async function getPendingInvitationsForEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const invitations = await db
    .select()
    .from(projectInvitations)
    .where(and(
      eq(projectInvitations.email, email),
      eq(projectInvitations.status, 'pending')
    ));

  // Filter out expired ones
  return invitations.filter(inv => inv.expiresAt > now);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get project media with access check (for collaborators)
 */
export async function getProjectMediaWithAccess(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First verify user has access to the project
  const hasAccess = await userHasProjectAccess(projectId, userId);
  if (!hasAccess) {
    return null;
  }

  return db
    .select()
    .from(media)
    .where(eq(media.projectId, projectId))
    .orderBy(desc(media.createdAt));
}
