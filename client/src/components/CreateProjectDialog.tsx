/**
 * Create Project Dialog
 * Modal form for creating new drone mapping projects
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar, Loader2, MapPin, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [flightDate, setFlightDate] = useState("");

  const utils = trpc.useUtils();

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully!", {
        description: `"${name}" has been added to your projects.`,
      });
      utils.project.list.invalidate();
      utils.project.count.invalidate();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to create project", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLocation("");
    setClientName("");
    setFlightDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    createProject.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      clientName: clientName.trim() || undefined,
      flightDate: flightDate ? new Date(flightDate) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle
              className="text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Create New Project
            </DialogTitle>
            <DialogDescription>
              Add a new drone mapping project. You can add media and map data
              after creating the project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Project Name - Required */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Downtown Construction Site Survey"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give your project a descriptive name for easy identification.
              </p>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project scope, objectives, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid gap-2">
              <Label htmlFor="location" className="text-sm font-medium">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., 123 Main St, City, State or GPS coordinates"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Client Name */}
            <div className="grid gap-2">
              <Label htmlFor="clientName" className="text-sm font-medium">
                <User className="inline h-3.5 w-3.5 mr-1" />
                Client Name
              </Label>
              <Input
                id="clientName"
                placeholder="e.g., ABC Construction Company"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Flight Date */}
            <div className="grid gap-2">
              <Label htmlFor="flightDate" className="text-sm font-medium">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                Flight Date
              </Label>
              <Input
                id="flightDate"
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                When was or will the drone flight be conducted?
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={createProject.isPending || !name.trim()}
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
