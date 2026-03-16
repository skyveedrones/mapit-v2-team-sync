/**
 * OnboardingPilot - Provider Branding Onboarding
 * Route: /onboarding/pilot
 * 
 * Allows drone service providers (pilots) to set up their organization branding:
 * - Organization name
 * - Organization type (provider, municipality, other)
 * - Logo upload (replaces MAPIT logo in header for their clients)
 * - Subscription tier selection
 */

import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Upload, CheckCircle2, ArrowRight, Loader2, Image as ImageIcon } from "lucide-react";

const STEPS = [
  { id: 1, title: "Organization Info", description: "Tell us about your company" },
  { id: 2, title: "Brand Identity", description: "Upload your logo" },
  { id: 3, title: "You're Ready!", description: "Start using MAPIT" },
];

export default function OnboardingPilot() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"provider" | "municipality" | "other">("provider");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createOrg = trpc.organization.create.useMutation({
    onSuccess: () => {
      setStep(3);
    },
    onError: (err) => {
      toast.error("Failed to create organization: " + err.message);
      setIsSubmitting(false);
    },
  });

  const uploadLogo = trpc.organization.uploadLogo.useMutation({
    onError: (err) => {
      toast.error("Logo upload failed: " + err.message);
      setIsSubmitting(false);
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleStep1Submit = () => {
    if (!orgName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = async () => {
    setIsSubmitting(true);
    try {
      let logoUrl: string | undefined;
      let logoKey: string | undefined;

      // Upload logo if provided
      if (logoFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        const result = await uploadLogo.mutateAsync({
          base64,
          filename: logoFile.name,
          mimeType: logoFile.type,
        });
        logoUrl = result.url;
        logoKey = result.key;
      }

      // Create organization
      await createOrg.mutateAsync({
        name: orgName.trim(),
        type: orgType,
        logoUrl,
        logoKey,
      });
    } catch {
      // errors handled in mutation callbacks
    }
  };

  const handleFinish = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl font-bold tracking-widest text-primary">MAP</span>
          <span className="text-2xl font-bold tracking-widest text-foreground">IT</span>
        </div>
        <p className="text-muted-foreground text-sm">Provider Onboarding</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              step > s.id
                ? "bg-primary text-primary-foreground"
                : step === s.id
                ? "bg-primary/20 text-primary border border-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
            </div>
            <span className={`text-sm hidden sm:block ${step === s.id ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-1 ${step > s.id ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Organization Info */}
      {step === 1 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Organization Info</CardTitle>
                <CardDescription>Tell us about your drone services company</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input
                id="orgName"
                placeholder="e.g., SkyVee Drones, Aerial Solutions LLC"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStep1Submit()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This name will appear in client-facing emails and reports.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgType">Organization Type</Label>
              <Select value={orgType} onValueChange={(v) => setOrgType(v as typeof orgType)}>
                <SelectTrigger id="orgType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provider">Drone Service Provider</SelectItem>
                  <SelectItem value="municipality">Municipality / Government</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Helps us tailor the experience for your use case.
              </p>
            </div>

            <Button className="w-full" onClick={handleStep1Submit}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <button
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setLocation("/dashboard")}
            >
              Skip for now
            </button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Logo Upload */}
      {step === 2 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Brand Identity</CardTitle>
                <CardDescription>Upload your company logo (optional)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your logo will replace the MAPIT logo in the header when your clients view their projects. This creates a white-label experience for your customers.
            </p>

            {/* Logo Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                logoPreview ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-20 max-w-48 object-contain"
                  />
                  <p className="text-sm text-muted-foreground">Click to change logo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Click to upload logo</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 5MB</p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoSelect}
            />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleStep2Submit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>

            <button
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleStep2Submit}
              disabled={isSubmitting}
            >
              Skip logo for now
            </button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">You're all set, {user?.name?.split(" ")[0] || "Pilot"}!</CardTitle>
            <CardDescription className="text-base mt-2">
              <strong>{orgName}</strong> has been created. Your clients will see your branding when they view their projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm font-medium">What's next:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create your first project from the Dashboard</li>
                <li>• Invite clients to view their project deliverables</li>
                <li>• Upload drone media and generate GPS maps</li>
              </ul>
            </div>
            <Button className="w-full" onClick={handleFinish}>
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
