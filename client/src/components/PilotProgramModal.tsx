/**
 * Pilot Program Modal
 * Allows users to apply for the municipal pilot program
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PilotProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PilotProgramModal({ open, onOpenChange }: PilotProgramModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    department: "",
    primaryInterest: "",
    timeline: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMutation = trpc.municipal.submitPilotApplication.useMutation({
    onSuccess: () => {
      toast.success("Application submitted!", {
        description: "We'll schedule a discovery call within 48 hours.",
        duration: 5000,
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        city: "",
        department: "",
        primaryInterest: "",
        timeline: "",
        message: "",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to submit application", {
        description: error.message || "Please try again later.",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.city.trim() ||
      !formData.department.trim() ||
      !formData.primaryInterest.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        department: formData.department.trim(),
        primaryInterest: formData.primaryInterest.trim(),
        timeline: formData.timeline.trim() || undefined,
        message: formData.message.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Municipal Pilot Program</DialogTitle>
          <DialogDescription>
            Apply to modernize your project oversight with MAPIT
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="pilot-name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pilot-name"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="pilot-email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pilot-email"
              type="email"
              placeholder="your@municipality.gov"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="pilot-phone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pilot-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="pilot-city">
              City/Municipality <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pilot-city"
              placeholder="e.g., Dallas, TX"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="pilot-department">
              Department/Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pilot-department"
              placeholder="e.g., Public Works Director"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
            />
          </div>

          {/* Primary Interest */}
          <div className="space-y-2">
            <Label htmlFor="pilot-interest">
              Primary Interest <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.primaryInterest} onValueChange={(value) => setFormData({ ...formData, primaryInterest: value })}>
              <SelectTrigger id="pilot-interest">
                <SelectValue placeholder="Select your primary interest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="underground_utilities">Underground Utilities Verification</SelectItem>
                <SelectItem value="construction_oversight">Construction Project Oversight</SelectItem>
                <SelectItem value="infrastructure_planning">Infrastructure Planning & Assessment</SelectItem>
                <SelectItem value="asset_management">Asset Management & Inventory</SelectItem>
                <SelectItem value="emergency_response">Emergency Response & Damage Assessment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <Label htmlFor="pilot-timeline">Implementation Timeline (optional)</Label>
            <Select value={formData.timeline} onValueChange={(value) => setFormData({ ...formData, timeline: value })}>
              <SelectTrigger id="pilot-timeline">
                <SelectValue placeholder="When would you like to start?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediately (within 30 days)</SelectItem>
                <SelectItem value="q2">Q2 2026</SelectItem>
                <SelectItem value="q3">Q3 2026</SelectItem>
                <SelectItem value="q4">Q4 2026</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="pilot-message">Tell us about your project (optional)</Label>
            <Textarea
              id="pilot-message"
              placeholder="Describe your most complex active job site or infrastructure challenge..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Apply to Pilot Program
              </>
            )}
          </Button>
        </form>

        {/* Info */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-400 space-y-2">
          <p>
            <strong>No commitment required.</strong> We'll schedule a 30-minute discovery call to assess fit and discuss program details.
          </p>
          <p className="text-xs">
            Typical response time: <strong>48 hours</strong> during business days.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
