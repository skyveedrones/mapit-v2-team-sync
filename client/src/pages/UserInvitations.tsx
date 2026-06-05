import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Check, AlertCircle, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function UserInvitations() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    clientId: '',
    projectIds: [] as number[],
  });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createInvitationMutation = trpc.users.createUserInvitation.useMutation();
  const clientsQuery = trpc.clients.getOwnerClients.useQuery();
  const projectsQuery = trpc.projects.getAll.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await createInvitationMutation.mutateAsync({
        email: formData.email,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
        projectIds: formData.projectIds,
      });

      toast.success('Invitation sent successfully!');
      setFormData({ email: '', clientId: '', projectIds: [] });
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invitation');
    }
  };

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Invitations</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage user invitations for your workspace
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Invitation
        </Button>
      </div>

      {/* Invitation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user. They'll receive an email with a link to set up their account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={createInvitationMutation.isPending}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Assign to Client (Optional)</label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                disabled={createInvitationMutation.isPending || clientsQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsQuery.isLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading clients...</div>
                  ) : clientsQuery.data && clientsQuery.data.length > 0 ? (
                    clientsQuery.data.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">No clients available</div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                The user will be added to this client's workspace
              </p>
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Assign to Projects (Optional)</label>
              <div className="border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {projectsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading projects...</p>
                ) : projectsQuery.data && projectsQuery.data.length > 0 ? (
                  projectsQuery.data.map((project) => (
                    <label key={project.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.projectIds.includes(project.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              projectIds: [...formData.projectIds, project.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              projectIds: formData.projectIds.filter(id => id !== project.id),
                            });
                          }
                        }}
                        disabled={createInvitationMutation.isPending}
                        className="rounded"
                      />
                      <span className="text-sm">{project.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No projects available</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The user will have access to these projects
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={createInvitationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvitationMutation.isPending}
                className="gap-2"
              >
                {createInvitationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>How it works:</strong> When you send an invitation, the user will receive an email with a temporary password and a link to set up their account. After they set their permanent password, they'll be automatically logged in and redirected to their dashboard.
          </p>
        </div>
      </Card>

      {/* Recent Invitations */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Invitations</h2>
          <p className="text-muted-foreground text-sm">
            Invitation history will be displayed here once you send invitations.
          </p>
        </div>
      </Card>
    </div>
  );
}
