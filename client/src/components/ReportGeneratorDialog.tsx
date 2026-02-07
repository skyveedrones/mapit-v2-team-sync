/**
 * Report Generator Dialog
 * Allows users to generate PDF reports with project info, map, and selected media
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  Check,
  Download,
  Eye,
  FileImage,
  FileText,
  Image,
  Loader2,
  Map,
  MapPin,
  Route,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ReportGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  media: Media[];
  isDemoProject?: boolean;
}

type ResolutionPreset = "high" | "medium" | "low" | "thumbnail";
type MapStyle = "roadmap" | "satellite" | "hybrid" | "terrain";

const RESOLUTION_OPTIONS: { value: ResolutionPreset; label: string; description: string }[] = [
  { value: "high", label: "High Quality", description: "1920px - Best for printing" },
  { value: "medium", label: "Medium Quality", description: "1280px - Good balance" },
  { value: "low", label: "Low Quality", description: "800px - Smaller file size" },
  { value: "thumbnail", label: "Thumbnail", description: "400px - Smallest file" },
];

const MAP_STYLE_OPTIONS: { value: MapStyle; label: string; description: string }[] = [
  { value: "hybrid", label: "Hybrid", description: "Satellite imagery with labels" },
  { value: "satellite", label: "Satellite", description: "Satellite imagery only" },
  { value: "roadmap", label: "Roadmap", description: "Standard road map" },
  { value: "terrain", label: "Terrain", description: "Physical terrain features" },
];

// Detect if user is on a mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function ReportGeneratorDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  media,
  isDemoProject = false,
}: ReportGeneratorDialogProps) {
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  // Default to 'low' resolution on mobile devices to keep file size manageable
  const [resolution, setResolution] = useState<ResolutionPreset>(isMobileDevice() ? "low" : "medium");
  const [mapStyle, setMapStyle] = useState<MapStyle>("hybrid");
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [watermarkData, setWatermarkData] = useState<string | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<"top-left" | "top-right" | "center" | "bottom-left" | "bottom-right">("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(70);
  const [watermarkScale, setWatermarkScale] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const generateMutation = trpc.report.generate.useMutation();

  // Fetch user logo for report header (skip for demo project)
  const { data: userLogo } = trpc.logo.get.useQuery(undefined, {
    enabled: !isDemoProject,
  });

  // Filter to only show photos
  const photos = media.filter(m => m.mediaType === "photo");

  const handleSelectAll = () => {
    if (selectedMediaIds.size === photos.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(photos.map(m => m.id)));
    }
  };

  const handleToggleMedia = (mediaId: number) => {
    const newSet = new Set(selectedMediaIds);
    if (newSet.has(mediaId)) {
      newSet.delete(mediaId);
    } else {
      newSet.add(mediaId);
    }
    setSelectedMediaIds(newSet);
  };

  const handleWatermarkUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setWatermarkData(base64);
      toast.success("Watermark image uploaded");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerateReport = async () => {
    if (selectedMediaIds.size === 0) {
      toast.error("Please select at least one photo");
      return;
    }

    if (includeWatermark && !watermarkData) {
      toast.error("Please upload a watermark image");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        projectId,
        mediaIds: Array.from(selectedMediaIds),
        resolution,
        mapStyle,
        showFlightPath,
        includeWatermark,
        watermarkData: watermarkData || undefined,
        watermarkPosition,
        watermarkOpacity,
        watermarkScale,
        userLogoUrl: userLogo?.logoUrl || undefined,
      });

      setPreviewHtml(result.html);
      setShowPreview(true);
      toast.success(`Report generated with ${result.mediaCount} photos`);
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const downloadPdfMutation = trpc.report.downloadPdf.useMutation();
  const emailReportMutation = trpc.report.emailReport.useMutation();

  const handleEmailReport = async () => {
    if (!previewHtml) return;
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsEmailing(true);
    toast.info("Generating PDF and sending via email, please wait...");

    try {
      // Send HTML to server for PDF generation and emailing
      const result = await emailReportMutation.mutateAsync({
        html: previewHtml,
        projectName,
        recipientEmail,
      });

      toast.success(result.message || "Report sent successfully!");
      setShowEmailDialog(false);
      setRecipientEmail("");
    } catch (error: any) {
      console.error("Failed to email report:", error);
      toast.error(error.message || "Failed to send email. Please try again.");
    } finally {
      setIsEmailing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewHtml) return;

    setIsDownloading(true);
    
    try {
      // Create a new window with the HTML content
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast.error('Please allow popups to download PDF');
        return;
      }
      
      // Write the HTML with complete print styles matching the server-generated PDF
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${projectName} - Report</title>
          <style>
            @page {
              margin: 0.3in 0.4in;
              size: letter;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #1a1a1a;
              background: #fff;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          ${previewHtml}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for images to load
      printWindow.onload = () => {
        setTimeout(() => {
          // Trigger print dialog
          printWindow.print();
          toast.success('Print dialog opened! Save as PDF to download.');
          setIsDownloading(false);
        }, 500);
      };
      
    } catch (error: any) {
      console.error('[PDF Generation Error]:', error);
      toast.error('Failed to open print dialog. Please try again.');
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setPreviewHtml(null);
    onOpenChange(false);
  };

  // Email dialog (check this FIRST before preview)
  if (showEmailDialog && previewHtml) {
    return (
      <Dialog open={open} onOpenChange={() => setShowEmailDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Report
            </DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send the PDF report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={isEmailing}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              The PDF report will be generated and sent to this email address. This may take a minute for reports with many photos.
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEmailDialog(false)}
              disabled={isEmailing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEmailReport}
              disabled={isEmailing || !recipientEmail}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isEmailing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Preview mode
  if (showPreview && previewHtml) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Report Preview
            </DialogTitle>
            <DialogDescription>
              Review your report before downloading. Use the Download button to save as PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[60vh] border-0"
              title="Report Preview"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="h-4 w-4 mr-2" />
              Back to Options
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowEmailDialog(true)}
              disabled={isEmailing || isDownloading}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Report
            </Button>
            <Button 
              onClick={handleDownloadPdf} 
              disabled={isDownloading || isEmailing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Project Report
          </DialogTitle>
          <DialogDescription>
            Create a PDF report with project information, map, and selected media files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* Media Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Photos</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedMediaIds.size === photos.length ? (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Select All ({photos.length})
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-auto p-2 border rounded-lg bg-muted/30">
              {photos.length === 0 ? (
                <p className="col-span-full text-center text-muted-foreground py-4">
                  No photos available in this project
                </p>
              ) : (
                photos.map((item) => (
                  <div
                    key={item.id}
                    className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedMediaIds.has(item.id)
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    onClick={() => handleToggleMedia(item.id)}
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1">
                      <Checkbox
                        checked={selectedMediaIds.has(item.id)}
                        className="bg-white/90 border-gray-400"
                      />
                    </div>
                    {!item.latitude && (
                      <div className="absolute bottom-1 right-1 bg-amber-500 text-white text-xs px-1 rounded">
                        <MapPin className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedMediaIds.size} of {photos.length} photos selected
            </p>
            {isMobileDevice() && selectedMediaIds.size > 8 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <svg className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-yellow-600 dark:text-yellow-500">
                  <strong>Mobile Device Detected:</strong> Selecting more than 8 photos may cause download issues. Consider using fewer photos or switch to desktop for large reports.
                </div>
              </div>
            )}
          </div>

          {/* Resolution Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Image Resolution</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Map Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-emerald-500" />
              <Label className="text-base font-semibold">Map Options</Label>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Configure how the project map appears in your report
            </p>
            
            {/* Map Style */}
            <div className="space-y-2">
              <Label>Map Style</Label>
              <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as MapStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAP_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flight Path Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-emerald-500" />
                <div className="space-y-0.5">
                  <Label>Show Flight Path</Label>
                  <p className="text-xs text-muted-foreground">
                    Draw a line connecting GPS points in capture order
                  </p>
                </div>
              </div>
              <Switch
                checked={showFlightPath}
                onCheckedChange={setShowFlightPath}
              />
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedMediaIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
