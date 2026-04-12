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
  
  // Query to check if user is the owner or collaborator of the project
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId && !!user }
  );

  // Query to get all projects owned by the user (for global client-only check)
  const { data: ownedProjects } = trpc.project.list.useQuery(
    undefined,
    { enabled: !projectId && !!user }
  );

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

  if (!user || !project) {
    return {
      isClientOnly: false,
      isOwner: false,
      isCollaborator: false,
      canEdit: false,
      canDelete: false,
      canView: false,
    };
  }

  // Check if user is the owner
  const isOwner = project.userId === user.id;

  // Check if user has platform admin or webmaster role
  const isPlatformAdmin = user.role === 'admin' || user.role === 'webmaster';

  // Check if user is a collaborator (would need to query collaborators)
  // For now, we'll assume if they're not the owner but have access, they're a client user
  // UNLESS they are a platform admin
  const isClientOnly = !isOwner && !isPlatformAdmin;

  return {
    isClientOnly,
    isOwner,
    isCollaborator: false, // TODO: Implement collaborator check if needed
    canEdit: isOwner || isPlatformAdmin, // Owner or platform admin can edit
    canDelete: isOwner || isPlatformAdmin, // Owner or platform admin can delete
    canView: true, // Everyone with access can view
  };
}
