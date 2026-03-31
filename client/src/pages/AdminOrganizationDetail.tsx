import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Building2, Users, FolderOpen } from 'lucide-react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function AdminOrganizationDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is webmaster or org admin for their own organization
  const orgId = parseInt(id);
  const isWebmaster = user?.role === 'webmaster';
  const isOrgAdmin = user?.orgRole === 'ORG_ADMIN' && user?.organizationId === orgId;
  
  if (!isWebmaster && !isOrgAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Only webmasters can access the admin dashboard.
            </p>
            <Button onClick={() => setLocation('/account')} className="w-full">
              Back to Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch organization details
  const { data: org, isLoading } = trpc.admin.getOrganizationDetails.useQuery({
    organizationId: parseInt(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Organization Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The organization you're looking for doesn't exist.
            </p>
            <Button onClick={() => setLocation('/admin')} className="w-full">
              Back to Admin Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Button>
        <h1 className="text-3xl font-bold">{org.name}</h1>
        <p className="text-muted-foreground mt-2">
          Organization details and members
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{org.userCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-500" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{org.projectCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium capitalize">{org.type}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Members ({org.users?.length || 0})</CardTitle>
          <CardDescription>
            Users in this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {org.users && org.users.length > 0 ? (
                  org.users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <CardTitle>Projects ({org.projects?.length || 0})</CardTitle>
          <CardDescription>
            Projects in this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {org.projects && org.projects.length > 0 ? (
              org.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {project.mediaCount} media files
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No projects found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
