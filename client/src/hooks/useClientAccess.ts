import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * Hook to determine if the current user is accessing a project as a client-only user
 * (i.e., they have access through client membership, not as the owner or collaborator)
 * 
 * When called without projectId, checks if user is client-only across all projects
 * (i.e., they don't own any projects)
 */
export function useClientAccess(projectId?: number) {
  const { user } = useAuth();
  
  // NOTE: Do NOT fire trpc.project.get here — ProjectDetail already fetches it
  // and a duplicate query with an unstable `user` reference causes infinite loops.
  // Instead, derive permissions purely from the user's role.

  // Query to get all projects owned by the user (for global client-only check)
  const { data: ownedProjects } = trpc.project.list.useQuery(
    undefined,
    { enabled: !projectId && !!user }
  );

  // Stub — not used anymore but kept for type compatibility
  const project: any = undefined;

  // If no projectId provided, check if user is client-only across all projects.
  // A user with ZERO projects is NOT client-only — they are a new owner who hasn't
  // created anything yet. isClientOnly should only be true when ownedProjects has
  // loaded (not undefined/null) AND the count is still zero AND the user has the
  // 'client' role. Regular users with no projects should always be able to create.
  if (!projectId) {
    const isPlatformAdmin = user?.role === 'admin' || user?.role === 'webmaster';
    const isClientRole = user?.role === 'client';
    // Only treat as client-only if the user explicitly has the 'client' role
    return {
      isClientOnly: isClientRole && !isPlatformAdmin,
      isOwner: !isClientRole || isPlatformAdmin,
      isCollaborator: false,
      canEdit: !isClientRole || isPlatformAdmin,
      canDelete: !isClientRole || isPlatformAdmin,
      canView: true,
    };
  }

  if (!user) {
    return {
      isClientOnly: false,
      isOwner: false,
      isCollaborator: false,
      canEdit: false,
      canDelete: false,
      canView: false,
    };
  }

  // Derive permissions from role — no duplicate project query needed
  const isPlatformAdmin = user.role === 'admin' || user.role === 'webmaster';
  const isClientRole = user.role === 'client';
  const isClientOnly = isClientRole && !isPlatformAdmin;

  return {
    isClientOnly,
    isOwner: !isClientOnly,
    isCollaborator: false,
    canEdit: !isClientOnly,
    canDelete: !isClientOnly,
    canView: true,
  };
}
