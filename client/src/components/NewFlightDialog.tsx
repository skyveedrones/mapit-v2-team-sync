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
import { Calendar, Loader2, Plane } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface NewFlightDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewFlightDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: NewFlightDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flightDate, setFlightDate] = useState("");

  const utils = trpc.useUtils();

  const createFlight = trpc.flight.create.useMutation({
    onSuccess: () => {
      toast.success("Flight created successfully!");
      utils.flight.list.invalidate({ projectId });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to create flight", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setFlightDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a flight name");
      return;
    }

    createFlight.mutate({
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      flightDate: flightDate ? new Date(flightDate) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            New Flight
          </DialogTitle>
          <DialogDescription>
            Create a new flight folder to organize drone media from a specific flight session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flight-name">Flight Name *</Label>
            <Input
              id="flight-name"
              placeholder="e.g., Morning Survey Flight 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createFlight.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flight-date">Flight Date</Label>
            <div className="relative">
              <Input
                id="flight-date"
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                disabled={createFlight.isPending}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flight-description">Description (Optional)</Label>
            <Textarea
              id="flight-description"
              placeholder="Add notes about this flight..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createFlight.isPending}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createFlight.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createFlight.isPending}>
              {createFlight.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Flight"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
