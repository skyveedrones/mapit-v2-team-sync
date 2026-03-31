import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Building2, Users, FolderOpen, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function OrganizationList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is webmaster or org admin
  const isWebmaster = user?.role === 'webmaster';
  const isOrgAdmin = user?.orgRole === 'ORG_ADMIN';

  if (!isWebmaster && !isOrgAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <Button onClick={() => setLocation('/account')} className="w-full">
              Back to Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch organizations based on user role
  const { data: organizations, isLoading } = trpc.admin.listOrganizations.useQuery(
    undefined,
    { enabled: isWebmaster || isOrgAdmin }
  );

  const userOrganization = isOrgAdmin && user?.organizationId ? user.organizationId : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // For Org Admins, show only their organization
  const displayOrganizations = isOrgAdmin && userOrganization
    ? [{ id: userOrganization, name: user?.organization || 'Your Organization' }]
    : organizations || [];

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation(isWebmaster ? '/admin' : '/account')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Organizations</h1>
        <p className="text-muted-foreground mt-2">
          {isWebmaster
            ? 'Manage all organizations in the system'
            : 'View your organization details'}
        </p>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayOrganizations && displayOrganizations.length > 0 ? (
          displayOrganizations.map((org: any) => (
            <Card
              key={org.id}
              className="cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => setLocation(`/organization/${org.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-500" />
                      {org.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Click to view details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {org.userCount || 0} users
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {org.projectCount || 0} projects
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No organizations found</p>
          </div>
        )}
      </div>
    </div>
  );
}
