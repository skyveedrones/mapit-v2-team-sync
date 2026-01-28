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

export function ReportGeneratorDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  media,
}: ReportGeneratorDialogProps) {
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  const [resolution, setResolution] = useState<ResolutionPreset>("medium");
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

  // Fetch user logo for report header
  const { data: userLogo } = trpc.logo.get.useQuery();

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

  const handleDownloadPdf = () => {
    if (!previewHtml) return;

    // Create a new window with the HTML content
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download the report");
      return;
    }

    printWindow.document.write(previewHtml);
    printWindow.document.close();

    // Wait for images to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const handleClose = () => {
    setShowPreview(false);
    setPreviewHtml(null);
    onOpenChange(false);
  };

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
            <Button onClick={handleDownloadPdf} className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
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

          {/* Watermark Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Add Watermark</Label>
                <p className="text-sm text-muted-foreground">
                  Apply your logo to all photos in the report
                </p>
              </div>
              <Switch
                checked={includeWatermark}
                onCheckedChange={setIncludeWatermark}
              />
            </div>

            {includeWatermark && (
              <div className="space-y-4 pt-2">
                {/* Watermark Upload */}
                <div className="space-y-2">
                  <Label>Watermark Image</Label>
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWatermarkUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => watermarkInputRef.current?.click()}
                    className="w-full"
                  >
                    {watermarkData ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-emerald-500" />
                        Watermark Uploaded
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Watermark Image
                      </>
                    )}
                  </Button>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={watermarkPosition} onValueChange={(v: any) => setWatermarkPosition(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Opacity</Label>
                    <span className="text-sm text-muted-foreground">{watermarkOpacity}%</span>
                  </div>
                  <Slider
                    value={[watermarkOpacity]}
                    onValueChange={(v) => setWatermarkOpacity(v[0])}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Scale */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Size</Label>
                    <span className="text-sm text-muted-foreground">{watermarkScale}%</span>
                  </div>
                  <Slider
                    value={[watermarkScale]}
                    onValueChange={(v) => setWatermarkScale(v[0])}
                    min={5}
                    max={50}
                    step={5}
                  />
                </div>
              </div>
            )}
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
