import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

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
  const [step, setStep] = useState<1 | 2>(1); // Track which step we're on
  const [email, setEmail] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Fetch clients and projects
  const { data: clientsData, isLoading: clientsLoading } = trpc.clients.getOwnerClients.useQuery();
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.getAll.useQuery();
  const saveUserInfo = trpc.users.saveUserInfo.useMutation();
  const sendWelcomeEmail = trpc.users.sendWelcomeEmail.useMutation();

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

  // Step 1: Save user info
  const handleSaveInfo = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const result = await saveUserInfo.mutateAsync({
        email: email.trim(),
        clientId: selectedClient?.id,
        projectIds: selectedProjects.map(p => p.id),
        plan: selectedPlan,
      });

      setSavedToken(result.token);
      setSavedPassword(result.temporaryPassword);
      setStep(2); // Move to step 2
      toast.success('User information saved! Now send the welcome email.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user information');
    }
  };

  // Step 2: Send welcome email
  const handleSendEmail = async () => {
    if (!savedToken || !savedPassword) {
      toast.error('User information not saved');
      return;
    }

    try {
      await sendWelcomeEmail.mutateAsync({
        email: email.trim(),
        token: savedToken,
        temporaryPassword: savedPassword,
      });

      toast.success('Welcome email sent successfully!');
      
      // Reset form
      setEmail('');
      setSelectedProjects([]);
      setSelectedClient(null);
      setSelectedPlan('free');
      setSavedToken(null);
      setSavedPassword(null);
      setStep(1);
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send welcome email');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep(1);
    setEmail('');
    setSelectedProjects([]);
    setSelectedClient(null);
    setSelectedPlan('free');
    setSavedToken(null);
    setSavedPassword(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Invitations</h1>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Invitation
        </Button>
      </div>

      {/* Two-Step Invitation Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? 'Create User Invitation' : 'Send Welcome Email'}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? 'Enter user information and assign projects'
                : 'Send the welcome email to the new user'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            // Step 1: Save Info
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saveUserInfo.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subscription Plan</label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assign to Client (Optional)</label>
                <div className="relative">
                  <Input
                    placeholder="Search and select a client..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                  />
                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md mt-1 z-10 max-h-48 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left px-3 py-2 hover:bg-accent"
                        >
                          {client.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedClient && (
                  <div className="mt-2 p-2 bg-accent rounded-md flex items-center justify-between">
                    <span className="text-sm">{selectedClient.name}</span>
                    <button
                      onClick={handleRemoveClient}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assign Projects (Optional)</label>
                <div className="relative">
                  <Input
                    placeholder="Search and select projects..."
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setShowProjectDropdown(true);
                    }}
                    onFocus={() => setShowProjectDropdown(true)}
                  />
                  {showProjectDropdown && filteredProjects.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md mt-1 z-10 max-h-48 overflow-y-auto">
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleAddProject(project)}
                          className="w-full text-left px-3 py-2 hover:bg-accent"
                        >
                          {project.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProjects.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-muted-foreground">Selected Projects ({selectedProjects.length})</p>
                    {selectedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="p-2 bg-accent rounded-md flex items-center justify-between"
                      >
                        <span className="text-sm">{project.name}</span>
                        <button
                          onClick={() => handleRemoveProject(project.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={saveUserInfo.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveInfo}
                  disabled={saveUserInfo.isPending}
                  className="gap-2"
                >
                  {saveUserInfo.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Info
                </Button>
              </div>
            </div>
          ) : (
            // Step 2: Send Email
            <div className="space-y-4">
              <div className="p-4 bg-accent rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">User Created Successfully</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Email: <strong>{email}</strong>
                </p>
                {selectedClient && (
                  <p className="text-sm text-muted-foreground">
                    Client: <strong>{selectedClient.name}</strong>
                  </p>
                )}
                {selectedProjects.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Projects: <strong>{selectedProjects.length} assigned</strong>
                  </p>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The user has been created with a temporary password. Click "Send Email" to send them the welcome email with setup instructions.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={sendWelcomeEmail.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={sendWelcomeEmail.isPending}
                  className="gap-2"
                >
                  {sendWelcomeEmail.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
