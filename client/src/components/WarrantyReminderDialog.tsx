/**
 * Warranty Reminder Dialog
 * Configure automated warranty reminder emails at 3, 6, 9 month intervals
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Bell, Calendar, Loader2, Mail, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WarrantyReminderDialogProps {
  projectId: number;
  projectName: string;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_TEMPLATES = {
  standard: {
    name: "Standard Reminder",
    subject: "Warranty Reminder: {{projectName}}",
    body: `Dear Client,

This is a friendly reminder that the warranty for project "{{projectName}}" will expire on {{warrantyEndDate}}.

Current warranty period: {{warrantyStartDate}} - {{warrantyEndDate}}
Time remaining: {{timeRemaining}}

Please contact us if you have any questions or would like to schedule a follow-up inspection.

Best regards,
SkyVee Drone Services`,
  },
  inspection: {
    name: "Inspection Offer",
    subject: "Warranty Expiring Soon - Schedule Inspection: {{projectName}}",
    body: `Dear Client,

The warranty for your project "{{projectName}}" is approaching its expiration date of {{warrantyEndDate}}.

We recommend scheduling a follow-up drone inspection before your warranty expires to document the current condition of the site.

Would you like to schedule an inspection? Reply to this email or call us to set up an appointment.

Best regards,
SkyVee Drone Services`,
  },
  renewal: {
    name: "Renewal Offer",
    subject: "Warranty Renewal Available: {{projectName}}",
    body: `Dear Client,

The warranty for project "{{projectName}}" will expire on {{warrantyEndDate}}.

We're pleased to offer you a warranty renewal option. Renewing your warranty ensures continued coverage and peace of mind for your project.

Contact us to discuss renewal options and pricing.

Best regards,
SkyVee Drone Services`,
  },
};

export function WarrantyReminderDialog({
  projectId,
  projectName,
  warrantyStartDate,
  warrantyEndDate,
  open,
  onOpenChange,
}: WarrantyReminderDialogProps) {
  const [enabled, setEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [selectedIntervals, setSelectedIntervals] = useState<number[]>([3, 6, 9]);
  const [emailTemplate, setEmailTemplate] = useState<keyof typeof EMAIL_TEMPLATES>("standard");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);

  const utils = trpc.useUtils();

  // Fetch existing reminder config
  const { data: existingConfig, isLoading: configLoading } = trpc.warranty.getReminder.useQuery(
    { projectId },
    { enabled: open && projectId > 0 }
  );

  // Populate form when config loads
  useEffect(() => {
    if (existingConfig) {
      setEnabled(existingConfig.enabled === "yes");
      setReminderEmail(existingConfig.reminderEmail || "");
      try {
        const intervals = JSON.parse(existingConfig.intervals || "[3,6,9]");
        setSelectedIntervals(intervals);
      } catch {
        setSelectedIntervals([3, 6, 9]);
      }
      if (existingConfig.emailSubject || existingConfig.emailMessage) {
        setUseCustomTemplate(true);
        setCustomSubject(existingConfig.emailSubject || "");
        setCustomBody(existingConfig.emailMessage || "");
      }
    }
  }, [existingConfig]);

  const saveConfig = trpc.warranty.saveReminder.useMutation({
    onSuccess: () => {
      toast.success("Warranty reminders configured successfully!");
      utils.warranty.getReminder.invalidate({ projectId });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to save reminder configuration", {
        description: error.message,
      });
    },
  });

  const sendTestEmail = trpc.warranty.sendTestReminder.useMutation({
    onSuccess: () => {
      toast.success("Test email sent!", {
        description: `Check ${reminderEmail} for the test reminder.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to send test email", {
        description: error.message,
      });
    },
  });

  const handleIntervalToggle = (months: number) => {
    setSelectedIntervals((prev) =>
      prev.includes(months)
        ? prev.filter((m) => m !== months)
        : [...prev, months].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    if (enabled && !reminderEmail.trim()) {
      toast.error("Please enter an email address for reminders");
      return;
    }

    if (enabled && selectedIntervals.length === 0) {
      toast.error("Please select at least one reminder interval");
      return;
    }

    const templateValue = useCustomTemplate
      ? JSON.stringify({ subject: customSubject, body: customBody })
      : emailTemplate;

    saveConfig.mutate({
      projectId,
      enabled,
      reminderEmail: reminderEmail.trim(),
      intervals: selectedIntervals,
      emailSubject: useCustomTemplate ? customSubject : undefined,
      emailMessage: useCustomTemplate ? customBody : undefined,
    });
  };

  const handleSendTest = () => {
    if (!reminderEmail.trim()) {
      toast.error("Please enter an email address first");
      return;
    }

    const templateValue = useCustomTemplate
      ? JSON.stringify({ subject: customSubject, body: customBody })
      : emailTemplate;

    sendTestEmail.mutate({
      projectId,
      email: reminderEmail.trim(),
    });
  };

  // Calculate reminder dates based on warranty end date
  const getReminderDates = () => {
    if (!warrantyEndDate) return [];
    const endDate = new Date(warrantyEndDate);
    return selectedIntervals.map((months) => {
      const reminderDate = new Date(endDate);
      reminderDate.setMonth(reminderDate.getMonth() - months);
      return {
        months,
        date: reminderDate,
        isPast: reminderDate < new Date(),
      };
    });
  };

  const reminderDates = getReminderDates();

  if (!warrantyEndDate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Warranty Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Warranty Dates Set</h3>
            <p className="text-muted-foreground mb-4">
              Please set warranty start and end dates in the project settings first.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Warranty Reminder Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated email reminders before warranty expiration for "{projectName}".
          </DialogDescription>
        </DialogHeader>

        {configLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send email reminders before warranty expires
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {enabled && (
              <>
                {/* Email Address */}
                <div className="grid gap-2">
                  <Label htmlFor="reminder-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Reminder Email Address
                  </Label>
                  <Input
                    id="reminder-email"
                    type="email"
                    placeholder="client@example.com"
                    value={reminderEmail}
                    onChange={(e) => setReminderEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email address where warranty reminders should be sent.
                  </p>
                </div>

                {/* Reminder Intervals */}
                <div className="grid gap-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Reminder Intervals
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select when to send reminders before warranty expiration:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[3, 6, 9].map((months) => {
                      const reminderInfo = reminderDates.find((r) => r.months === months);
                      return (
                        <div
                          key={months}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedIntervals.includes(months)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleIntervalToggle(months)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Checkbox
                              checked={selectedIntervals.includes(months)}
                              onCheckedChange={() => handleIntervalToggle(months)}
                            />
                            <span className="font-medium">{months} Months</span>
                          </div>
                          {reminderInfo && (
                            <p className={`text-xs ${reminderInfo.isPast ? "text-destructive" : "text-muted-foreground"}`}>
                              {reminderInfo.isPast ? "Past: " : ""}
                              {reminderInfo.date.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email Template Selection */}
                <div className="grid gap-3">
                  <Label>Email Template</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="use-custom"
                      checked={useCustomTemplate}
                      onCheckedChange={(checked) => setUseCustomTemplate(checked as boolean)}
                    />
                    <Label htmlFor="use-custom" className="text-sm font-normal cursor-pointer">
                      Use custom template
                    </Label>
                  </div>

                  {!useCustomTemplate ? (
                    <Select value={emailTemplate} onValueChange={(v) => setEmailTemplate(v as keyof typeof EMAIL_TEMPLATES)}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="custom-subject">Subject Line</Label>
                        <Input
                          id="custom-subject"
                          placeholder="Warranty Reminder: {{projectName}}"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="custom-body">Email Body</Label>
                        <Textarea
                          id="custom-body"
                          placeholder="Enter your custom email message..."
                          value={customBody}
                          onChange={(e) => setCustomBody(e.target.value)}
                          className="bg-background border-border resize-none"
                          rows={6}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available placeholders: {"{{projectName}}"}, {"{{warrantyStartDate}}"}, {"{{warrantyEndDate}}"}, {"{{timeRemaining}}"}
                      </p>
                    </div>
                  )}

                  {/* Template Preview */}
                  {!useCustomTemplate && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium mb-1">Subject: {EMAIL_TEMPLATES[emailTemplate].subject}</p>
                      <p className="text-muted-foreground whitespace-pre-line text-xs">
                        {EMAIL_TEMPLATES[emailTemplate].body.substring(0, 200)}...
                      </p>
                    </div>
                  )}
                </div>

                {/* Test Email Button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTest}
                    disabled={sendTestEmail.isPending || !reminderEmail.trim()}
                  >
                    {sendTestEmail.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Test Email
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Preview how the reminder email will look
                  </span>
                </div>
              </>
            )}
          </div>
        )}

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
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
