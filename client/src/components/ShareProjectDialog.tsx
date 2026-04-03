/**
 * Share Project Dialog
 * Allows project owners to invite collaborators via email
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Check,
  Clock,
  Copy,
  Loader2,
  Mail,
  Send,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";

interface ShareProjectDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to generate project invite email template
function generateProjectInviteEmailTemplate(invite: { inviteUrl: string; email: string; role: string; projectName: string; inviterName: string }) {
  const roleDescription = invite.role === 'editor' 
    ? 'view, upload media, and edit project details'
    : 'view the project, media gallery, and interactive maps';
  
  return `Subject: You've been invited to collaborate on "${invite.projectName}" - MapIt

Hi,

${invite.inviterName} has invited you to collaborate on the project "${invite.projectName}" on MapIt.

As a ${invite.role}, you'll be able to ${roleDescription}.

To accept this invitation:

1. Click the link below (or copy and paste it into your browser):
   ${invite.inviteUrl}

2. Sign in with your email address (${invite.email})

3. Start collaborating on the project

What you can do:
• View interactive maps with drone footage
• Browse GPS-tagged photos and videos
• Download media files and GPS data
• Generate PDF reports
• Export data in multiple formats (KML, CSV, GeoJSON, GPX)
${invite.role === 'editor' ? '• Upload new media and manage project details' : ''}

This invitation link will expire in 7 days. If you have any questions, please contact ${invite.inviterName}.

Best regards,
The MapIt Team

---
This is an automated message from MapIt. Please do not reply to this email.`;
}

export function ShareProjectDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ShareProjectDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [inviteMethod, setInviteMethod] = useState<"email" | "copy">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<{ inviteUrl: string; email: string; role: string; projectName: string; inviterName: string } | null>(null);

  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Fetch collaborators
  const { data: collaborators, isLoading: loadingCollaborators } =
    trpc.sharing.getCollaborators.useQuery(
      { projectId },
      { enabled: open }
    );

  // Fetch invitations
  const { data: invitations, isLoading: loadingInvitations } =
    trpc.sharing.getInvitations.useQuery(
      { projectId },
      { enabled: open }
    );

  // Invite mutation
  const inviteMutation = trpc.sharing.invite.useMutation({
    onSuccess: (data) => {
      // Store the result for copy functionality
      if (data.inviteUrl && user) {
        setLastInviteResult({
          inviteUrl: data.inviteUrl,
          email: email,
          role: role,
          projectName: projectName,
          inviterName: user.name || 'A MapIt user',
        });
      }
      
      if (inviteMethod === "copy") {
        toast.success("Invitation link generated", {
          description: "Copy the link and email template below to send manually.",
          duration: 5000,
        });
      } else if (data.emailSent) {
        toast.success("Invitation sent!", {
          description: "You can also copy the link and email template below.",
          duration: 5000,
        });
      } else if (data.isNew) {
        toast.success("Invitation created", {
          description: "Email could not be sent. Use the copy button below to share manually.",
          duration: 5000,
        });
      } else {
        toast.info("Invitation already exists", {
          description: "A pending invitation already exists for this email address.",
        });
      }
      setEmail("");
      utils.sharing.getInvitations.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to send invitation", {
        description: error.message,
      });
    },
  });

  // Revoke invitation mutation
  const revokeMutation = trpc.sharing.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.sharing.getInvitations.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to revoke invitation", {
        description: error.message,
      });
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = trpc.sharing.removeCollaborator.useMutation({
    onSuccess: () => {
      toast.success("Collaborator removed");
      utils.sharing.getCollaborators.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to remove collaborator", {
        description: error.message,
      });
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await inviteMutation.mutateAsync({
        projectId,
        email: email.trim().toLowerCase(),
        role,
        sendEmail: inviteMethod === "email", // Only send email if email method is selected
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = (invitationId: number) => {
    revokeMutation.mutate({ invitationId });
  };

  const handleRemoveCollaborator = (userId: number) => {
    removeCollaboratorMutation.mutate({ projectId, userId });
  };

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") || [];
  const pastInvitations = invitations?.filter((inv) => inv.status !== "pending") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Invite team members to collaborate on "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="members">
              Members ({(collaborators?.length || 0) + pendingInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-2">
              <p className="text-sm text-blue-300">
                Select an <strong>Access Level</strong> to determine what your team member can do on this project.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
              </div>

              {/* Access Level */}
              <div className="space-y-2">
                <Label htmlFor="role">
                  Access Level <span className="text-red-500 font-bold">*</span>
                </Label>
                <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span>Viewer</span>
                        <span className="text-xs text-muted-foreground">
                          Can view project, media, and maps
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex flex-col items-start">
                        <span>Editor</span>
                        <span className="text-xs text-muted-foreground">
                          Can view, upload media, and edit
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invitation Method */}
              <div className="space-y-3 border-t pt-4">
                <Label>
                  Invitation Method <span className="text-red-500 font-bold">*</span>
                </Label>
                <RadioGroup value={inviteMethod} onValueChange={(v) => setInviteMethod(v as "email" | "copy")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="share-method-email" />
                    <Label htmlFor="share-method-email" className="font-normal cursor-pointer">
                      Send via MapIt Email - Automated email delivery
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="copy" id="share-method-copy" />
                    <Label htmlFor="share-method-copy" className="font-normal cursor-pointer">
                      Copy Link Only - I'll send manually
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!email.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {inviteMethod === "copy" ? "Generating Link..." : "Sending Invitation..."}
                  </>
                ) : inviteMethod === "copy" ? (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Generate & Copy Link
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>

            {/* Copy Section */}
            {lastInviteResult && (
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label>Invitation Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={lastInviteResult.inviteUrl}
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(lastInviteResult.inviteUrl);
                        toast.success("Link copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Template</Label>
                  <Textarea
                    readOnly
                    value={generateProjectInviteEmailTemplate(lastInviteResult)}
                    className="font-mono text-xs h-48"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        generateProjectInviteEmailTemplate(lastInviteResult)
                      );
                      toast.success("Email template copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Email Template
                  </Button>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300">How invitations work:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Invited users will receive an email with a link</li>
                <li>They must create an account or sign in to accept</li>
                <li>Invitations expire after 7 days</li>
              </ul>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Pending Invitations</h3>
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{inv.email}</p>
                        <p className="text-xs text-slate-400">
                          {inv.role} • Expires {format(new Date(inv.expiresAt), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2 flex-shrink-0"
                      onClick={() => handleRevokeInvitation(inv.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Active Collaborators */}
            {collaborators && collaborators.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Active Collaborators</h3>
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{collab.userEmail || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">
                          {collab.role} • Joined {format(new Date(collab.createdAt), "MMM d")}
                        </p>
                      </div>
                    </div>
                    {user?.id !== collab.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2 flex-shrink-0"
                        onClick={() => handleRemoveCollaborator(collab.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {(!collaborators || collaborators.length === 0) && pendingInvitations.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No collaborators yet</p>
                <p className="text-xs text-slate-500">Invite team members from the Invite tab</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
