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

function generateSampleDemoReport(): string {
  // This is a placeholder that will be replaced with actual generated report HTML
  // The real sample report is generated from the Demonstration Project data
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MAPIT - Sample Project Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      border-bottom: 4px solid #10b981;
    }
    .header-logo {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 15px;
    }
    .header-meta {
      font-size: 12px;
      opacity: 0.8;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 15px;
      margin-top: 15px;
    }
    .content {
      padding: 40px 30px;
    }
    .section {
      margin-bottom: 35px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #10b981;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-icon {
      font-size: 18px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-item {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #10b981;
    }
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #1a1a2e;
    }
    .description-box {
      background: #f0f9ff;
      border-left: 4px solid #10b981;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      line-height: 1.7;
      color: #333;
    }
    .media-section {
      margin-top: 30px;
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .media-item {
      background: #f9f9f9;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #e5e5e5;
      text-align: center;
      padding: 15px;
    }
    .media-placeholder {
      width: 100%;
      height: 150px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 40px;
      margin-bottom: 10px;
    }
    .media-name {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
      word-break: break-word;
    }
    .media-info {
      font-size: 11px;
      color: #666;
    }
    .footer {
      background: #f9f9f9;
      border-top: 1px solid #e5e5e5;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer-text {
      margin: 5px 0;
    }
    .page-break {
      page-break-after: always;
      margin: 20px 0;
    }
    @media print {
      body {
        background: white;
      }
      .container {
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">MAPIT</div>
      <h1>Sample Project Report</h1>
      <div class="header-subtitle">Demonstration Flight Analysis</div>
      <div class="header-meta">
        <div>Generated: ${currentDate} at ${currentTime}</div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Project Information Section -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📋</span>
          PROJECT INFORMATION
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Location</div>
            <div class="info-value">Terrell, Texas, USA</div>
          </div>
          <div class="info-item">
            <div class="info-label">Client</div>
            <div class="info-value">Demo Client</div>
          </div>
          <div class="info-item">
            <div class="info-label">Flight Date</div>
            <div class="info-value">January 15, 2026</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">✓ Complete</div>
          </div>
          <div class="info-item">
            <div class="info-label">Media Count</div>
            <div class="info-value">11 Photos</div>
          </div>
          <div class="info-item">
            <div class="info-label">Pilot</div>
            <div class="info-value">Demo Pilot</div>
          </div>
          <div class="info-item">
            <div class="info-label">FAA License</div>
            <div class="info-value">N/A (Demo)</div>
          </div>
          <div class="info-item">
            <div class="info-label">LAANC Authorization</div>
            <div class="info-value">N/A (Demo)</div>
          </div>
        </div>
      </div>
      
      <!-- Description Section -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📝</span>
          DESCRIPTION
        </div>
        <div class="description-box">
          <p>This is a sample demonstration report showcasing the professional reporting capabilities of MAPIT. The report includes project information, flight statistics, and media documentation. In production use, this report would contain actual flight data, GPS coordinates, altitude information, and high-resolution imagery from your drone missions.</p>
          <p style="margin-top: 12px;">MAPIT enables efficient project documentation and analysis through comprehensive reporting tools designed for professionals in surveying, construction, agriculture, and environmental monitoring.</p>
        </div>
      </div>
      
      <!-- Project Media Section -->
      <div class="section media-section">
        <div class="section-title">
          <span class="section-icon">📸</span>
          PROJECT MEDIA
        </div>
        <div class="media-grid">
          <div class="media-item">
            <div class="media-placeholder">📷</div>
            <div class="media-name">Flight Photo 1</div>
            <div class="media-info">Infrastructure Inspection</div>
          </div>
          <div class="media-item">
            <div class="media-placeholder">📷</div>
            <div class="media-name">Flight Photo 2</div>
            <div class="media-info">Park Mapping Mission</div>
          </div>
          <div class="media-item">
            <div class="media-placeholder">📷</div>
            <div class="media-name">Flight Photo 3</div>
            <div class="media-info">Downtown Survey Flight</div>
          </div>
          <div class="media-item">
            <div class="media-placeholder">📷</div>
            <div class="media-name">Flight Photo 4</div>
            <div class="media-info">Downtown Survey Flight</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">This is a sample report for demonstration purposes.</div>
      <div class="footer-text">For production use, reports include actual flight data, GPS coordinates, and high-resolution imagery.</div>
      <div class="footer-text" style="margin-top: 10px; font-size: 11px; color: #999;">MAPIT © 2026 - Professional Drone Mapping Solutions</div>
    </div>
  </div>
</body>
</html>`;
}

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
    if (selectedMediaIds.size === 0 && !isDemoProject) {
      toast.error("Please select at least one photo");
      return;
    }

    if (includeWatermark && !watermarkData) {
      toast.error("Please upload a watermark image");
      return;
    }

    // For demo project, show the sample report immediately
    if (isDemoProject) {
      const sampleHtml = generateSampleDemoReport();
      setPreviewHtml(sampleHtml);
      setShowPreview(true);
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

  // This function is kept for reference but no longer used
  const _generateSampleDemoReport = generateSampleDemoReport;

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
      // Send HTML to server for PDF generation
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: previewHtml,
          filename: `${projectName}-report.pdf`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
      setIsDownloading(false);
      
    } catch (error: any) {
      console.error('[PDF Generation Error]:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
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
        <DialogContent className="max-w-[98vw] max-h-[98vh] flex flex-col w-[98vw] h-[98vh] p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Report Preview
            </DialogTitle>
            <DialogDescription>
              Review your report before downloading. Use the Download button to save as PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-lg bg-white min-h-0">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Report Preview"
            />
          </div>

          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-shrink-0">
              <X className="h-4 w-4 mr-2" />
              Return to Report Options
            </Button>
            <div className="flex gap-2 flex-1"></div>
            <Button 
              variant="outline"
              onClick={() => setShowEmailDialog(true)}
              disabled={isEmailing || isDownloading || isDemoProject}
              title={isDemoProject ? "Email not available for demo project" : ""}
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
              title=""
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
            disabled={isGenerating || (selectedMediaIds.size === 0 && !isDemoProject)}
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
