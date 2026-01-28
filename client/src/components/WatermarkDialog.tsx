/**
 * Watermark Dialog Component
 * Allows users to upload a logo and apply watermarks to selected images
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  Download,
  ImagePlus,
  Loader2,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface WatermarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMedia: Media[];
  projectId: number;
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export function WatermarkDialog({
  open,
  onOpenChange,
  selectedMedia,
  projectId,
}: WatermarkDialogProps) {
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [opacity, setOpacity] = useState(70);
  const [scale, setScale] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ mediaId: number; success: boolean; url?: string; filename?: string; error?: string }[]>([]);

  const applyBatchMutation = trpc.watermark.applyBatch.useMutation();

  // Handle watermark file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG recommended for transparency)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Watermark image must be less than 5MB");
      return;
    }

    setWatermarkFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setWatermarkPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Apply watermark to selected images
  const handleApplyWatermark = async () => {
    if (!watermarkFile || selectedMedia.length === 0) {
      toast.error("Please upload a watermark and select images");
      return;
    }

    // Filter to only photos
    const photos = selectedMedia.filter(m => m.mediaType === "photo");
    if (photos.length === 0) {
      toast.error("No photos selected. Watermarks can only be applied to photos.");
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      // Convert watermark to base64
      const reader = new FileReader();
      const watermarkBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(watermarkFile);
      });

      // Apply watermark to all selected photos
      const result = await applyBatchMutation.mutateAsync({
        mediaIds: photos.map(m => m.id),
        watermarkData: watermarkBase64,
        position,
        opacity,
        scale,
      });

      setResults(result.results);

      if (result.successCount > 0) {
        toast.success(`Watermark applied to ${result.successCount} image${result.successCount > 1 ? "s" : ""}`);
      }
      if (result.failCount > 0) {
        toast.error(`Failed to process ${result.failCount} image${result.failCount > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Watermark error:", error);
      toast.error("Failed to apply watermark");
    } finally {
      setIsProcessing(false);
    }
  };

  // Download all watermarked images
  const handleDownloadAll = () => {
    const successfulResults = results.filter(r => r.success && r.url);
    successfulResults.forEach((result, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = result.url!;
        link.download = result.filename || `watermarked_${index}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // Stagger downloads
    });
  };

  // Reset dialog state
  const handleClose = (open: boolean) => {
    if (!open) {
      setWatermarkFile(null);
      setWatermarkPreview(null);
      setResults([]);
    }
    onOpenChange(open);
  };

  const photoCount = selectedMedia.filter(m => m.mediaType === "photo").length;
  const successCount = results.filter(r => r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Apply Watermark
          </DialogTitle>
          <DialogDescription>
            Upload your logo or watermark image and apply it to {photoCount} selected photo{photoCount !== 1 ? "s" : ""}.
            PNG images with transparency work best.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Watermark Upload */}
          <div className="space-y-2">
            <Label>Watermark Image</Label>
            {watermarkPreview ? (
              <div className="relative inline-block">
                <img
                  src={watermarkPreview}
                  alt="Watermark preview"
                  className="max-h-24 rounded border border-border bg-muted/50 p-2"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    setWatermarkFile(null);
                    setWatermarkPreview(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload watermark image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Recommended: PNG with transparent background, max 5MB
            </p>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
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
            <div className="flex items-center justify-between">
              <Label>Opacity</Label>
              <span className="text-sm text-muted-foreground">{opacity}%</span>
            </div>
            <Slider
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              min={10}
              max={100}
              step={5}
            />
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Size</Label>
              <span className="text-sm text-muted-foreground">{scale}% of image width</span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              min={5}
              max={50}
              step={5}
            />
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {successCount} of {results.length} processed successfully
                </span>
                {successCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                )}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {results.map((result) => {
                  const media = selectedMedia.find(m => m.id === result.mediaId);
                  return (
                    <div
                      key={result.mediaId}
                      className="flex items-center gap-2 text-xs"
                    >
                      {result.success ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                      )}
                      <span className="truncate flex-1">
                        {media?.filename || `Media ${result.mediaId}`}
                      </span>
                      {result.success && result.url && (
                        <a
                          href={result.url}
                          download={result.filename}
                          className="text-primary hover:underline"
                        >
                          Download
                        </a>
                      )}
                      {!result.success && (
                        <span className="text-destructive">{result.error}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {results.length > 0 ? "Done" : "Cancel"}
          </Button>
          {results.length === 0 && (
            <Button
              onClick={handleApplyWatermark}
              disabled={!watermarkFile || photoCount === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Apply to {photoCount} Photo{photoCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
