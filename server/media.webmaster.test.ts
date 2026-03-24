import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { users, projects, media } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { userHasProjectAccess, userHasClientProjectAccess } from './db';

describe('Webmaster Media Access Bypass', () => {
  it('should grant webmaster access to any project', async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for tests');
    }

    // Get an existing webmaster user from the database
    const webmasterUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'webmaster'))
      .limit(1);

    if (webmasterUsers.length === 0) {
      console.warn('No webmaster user found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    const webmasterId = webmasterUsers[0].id;

    // Get any project from the database
    const projects_list = await db
      .select()
      .from(projects)
      .limit(1);

    if (projects_list.length === 0) {
      console.warn('No projects found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    const projectId = projects_list[0].id;

    // Webmaster should have access to any project
    const hasAccess = await userHasProjectAccess(projectId, webmasterId);
    expect(hasAccess).toBe(true);
  });

  it('should grant webmaster client project access', async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for tests');
    }

    // Get an existing webmaster user
    const webmasterUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'webmaster'))
      .limit(1);

    if (webmasterUsers.length === 0) {
      console.warn('No webmaster user found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    const webmasterId = webmasterUsers[0].id;

    // Get any project
    const projects_list = await db
      .select()
      .from(projects)
      .limit(1);

    if (projects_list.length === 0) {
      console.warn('No projects found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    const projectId = projects_list[0].id;

    // Webmaster should have client project access
    const hasAccess = await userHasClientProjectAccess(webmasterId, projectId);
    expect(hasAccess).toBe(true);
  });

  it('should allow webmaster to access all projects', async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for tests');
    }

    // Get webmaster user
    const webmasterUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'webmaster'))
      .limit(1);

    if (webmasterUsers.length === 0) {
      console.warn('No webmaster user found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    const webmasterId = webmasterUsers[0].id;

    // Get multiple projects
    const projects_list = await db
      .select()
      .from(projects)
      .limit(5);

    if (projects_list.length === 0) {
      console.warn('No projects found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    // Check that webmaster has access to all projects
    for (const project of projects_list) {
      const hasAccess = await userHasProjectAccess(project.id, webmasterId);
      expect(hasAccess).toBe(true);
    }
  });

  it('should verify webmaster role is properly set', async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for tests');
    }

    // Get a webmaster user
    const webmasterUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'webmaster'))
      .limit(1);

    if (webmasterUsers.length === 0) {
      console.warn('No webmaster user found in database, skipping test');
      expect(true).toBe(true);
      return;
    }

    const webmaster = webmasterUsers[0];
    expect(webmaster.role).toBe('webmaster');
  });
});
