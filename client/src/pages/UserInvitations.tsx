import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, X, AlertCircle, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface SelectedProject {
  id: number;
  name: string;
}

interface SelectedClient {
  id: number;
  name: string;
}

export default function UserInvitations() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [sendIntroEmail, setSendIntroEmail] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Fetch clients and projects
  const { data: clientsData, isLoading: clientsLoading } = trpc.clients.getOwnerClients.useQuery();
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.getAll.useQuery();
  const createInvitation = trpc.users.createUserInvitation.useMutation();

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!projectsData) return [];
    return projectsData.filter(p =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) &&
      !selectedProjects.some(sp => sp.id === p.id)
    );
  }, [projectsData, projectSearch, selectedProjects]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) &&
      (!selectedClient || selectedClient.id !== c.id)
    );
  }, [clientsData, clientSearch, selectedClient]);

  const handleAddProject = (project: any) => {
    setSelectedProjects([...selectedProjects, { id: project.id, name: project.name }]);
    setProjectSearch('');
    setShowProjectDropdown(false);
  };

  const handleRemoveProject = (projectId: number) => {
    setSelectedProjects(selectedProjects.filter(p => p.id !== projectId));
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient({ id: client.id, name: client.name });
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setClientSearch('');
  };

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      await createInvitation.mutateAsync({
        email: email.trim(),
        clientId: selectedClient?.id,
        projectIds: selectedProjects.map(p => p.id),
        sendIntroEmail,
      });

      toast.success('Invitation sent successfully!');
      setEmail('');
      setSelectedProjects([]);
      setSelectedClient(null);
      setSendIntroEmail(true);
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEmail('');
    setSelectedProjects([]);
    setSelectedClient(null);
    setSendIntroEmail(true);
    setProjectSearch('');
    setClientSearch('');
    setShowProjectDropdown(false);
    setShowClientDropdown(false);
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
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Invitation
        </Button>
      </div>

      {/* How it works section */}
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          When you send an invitation, the user will receive an email with a temporary password and a link to set up their account. After they set their permanent password, they'll be automatically logged in and redirected to their dashboard with their assigned projects.
        </AlertDescription>
      </Alert>

      {/* Recent Invitations */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Invitations</h2>
          <p className="text-muted-foreground text-sm">
            Invitation history will be displayed here once you send invitations.
          </p>
        </div>
      </Card>

      {/* Create Invitation Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user. They'll receive an email with a temporary password and a link to set up their account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Address *</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                disabled={createInvitation.isPending}
              />
            </div>

            {/* Client Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Assign to Client (Optional)</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search and select a client..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  disabled={clientsLoading || createInvitation.isPending}
                  className="w-full"
                />
                {showClientDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {clientsLoading ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">Loading clients...</div>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                        >
                          {client.name}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground text-sm">No clients found</div>
                    )}
                  </div>
                )}
              </div>
              {selectedClient && (
                <div className="mt-2 flex items-center justify-between bg-accent p-3 rounded">
                  <span className="text-sm font-medium">{selectedClient.name}</span>
                  <button
                    onClick={handleRemoveClient}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Project Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Assign Projects (Optional)</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search and select projects..."
                  value={projectSearch}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setShowProjectDropdown(true);
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  disabled={projectsLoading || createInvitation.isPending}
                  className="w-full"
                />
                {showProjectDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {projectsLoading ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">Loading projects...</div>
                    ) : filteredProjects.length > 0 ? (
                      filteredProjects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => handleAddProject(project)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                        >
                          {project.name}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        {projectSearch ? 'No projects found' : 'All projects selected'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedProjects.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Selected Projects ({selectedProjects.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjects.map(project => (
                      <div
                        key={project.id}
                        className="flex items-center gap-2 bg-accent px-3 py-1 rounded-full text-sm"
                      >
                        <span>{project.name}</span>
                        <button
                          onClick={() => handleRemoveProject(project.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send Intro Email Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-accent rounded-md">
              <Checkbox
                id="send-email"
                checked={sendIntroEmail}
                onCheckedChange={(checked) => setSendIntroEmail(checked as boolean)}
                disabled={createInvitation.isPending}
              />
              <label htmlFor="send-email" className="text-sm cursor-pointer font-medium">
                Send introduction email with setup instructions
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={createInvitation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitation}
                disabled={createInvitation.isPending || !email.trim()}
                className="gap-2"
              >
                {createInvitation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {createInvitation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
