import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { adminRouter } from './admin';

/**
 * Admin Router Tests
 * Tests for webmaster-only dashboard procedures
 */

describe('Admin Router', () => {
  // Mock context for webmaster user
  const webmasterContext = {
    user: {
      id: 1,
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'webmaster' as const,
      organizationId: 1,
    },
  };

  // Mock context for non-webmaster user
  const regularUserContext = {
    user: {
      id: 2,
      name: 'Regular User',
      email: 'user@test.com',
      role: 'user' as const,
      organizationId: 1,
    },
  };

  describe('Role-based access control', () => {
    it('should reject non-webmaster users', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getDashboardStats();
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
        expect((error as TRPCError<any>).message).toContain('webmaster');
      }
    });

    it('should allow webmaster users', async () => {
      const caller = adminRouter.createCaller(webmasterContext as any);
      
      // This will fail due to no database, but should pass the role check
      try {
        await caller.getDashboardStats();
      } catch (error) {
        // Expected to fail with database error, not permission error
        expect((error as TRPCError<any>).code).not.toBe('FORBIDDEN');
      }
    });
  });

  describe('getDashboardStats', () => {
    it('should require webmaster role', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getDashboardStats();
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getAllOrganizations', () => {
    it('should require webmaster role', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getAllOrganizations();
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getAllUsers', () => {
    it('should require webmaster role', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getAllUsers();
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getAllProjects', () => {
    it('should require webmaster role', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getAllProjects();
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getOrganizationDetails', () => {
    it('should require webmaster role', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getOrganizationDetails({ organizationId: 1 });
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
      }
    });

    it('should validate organizationId input', async () => {
      const caller = adminRouter.createCaller(webmasterContext as any);
      
      try {
        // This will fail due to no database, but should pass input validation
        await caller.getOrganizationDetails({ organizationId: 1 });
      } catch (error) {
        // Should not be a validation error
        expect((error as any).code).not.toBe('BAD_REQUEST');
      }
    });
  });

  describe('getProjectDetails', () => {
    it('should require webmaster role', async () => {
      const caller = adminRouter.createCaller(regularUserContext as any);
      
      try {
        await caller.getProjectDetails({ projectId: 1 });
        expect.fail('Should have thrown FORBIDDEN error');
      } catch (error) {
        expect((error as TRPCError<any>).code).toBe('FORBIDDEN');
      }
    });

    it('should validate projectId input', async () => {
      const caller = adminRouter.createCaller(webmasterContext as any);
      
      try {
        // This will fail due to no database, but should pass input validation
        await caller.getProjectDetails({ projectId: 1 });
      } catch (error) {
        // Should not be a validation error
        expect((error as any).code).not.toBe('BAD_REQUEST');
      }
    });
  });
});
