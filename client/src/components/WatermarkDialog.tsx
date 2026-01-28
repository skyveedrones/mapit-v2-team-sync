/**
 * Watermark Dialog Component
 * Allows users to apply watermarks permanently to selected images
 * - Supports uploading new watermark or using saved watermark
 * - Permanently applies watermarks to stored images and thumbnails in S3
 * - Default position: upper-left corner
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
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  ImagePlus,
  Loader2,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

interface WatermarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMedia: Media[];
  projectId: number;
  onWatermarkApplied?: () => void;
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export function WatermarkDialog({
  open,
  onOpenChange,
  selectedMedia,
  projectId,
  onWatermarkApplied,
}: WatermarkDialogProps) {
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>("top-left");
  const [opacity, setOpacity] = useState(70);
  const [scale, setScale] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useSavedWatermark, setUseSavedWatermark] = useState(false);
  const [saveWatermarkForFuture, setSaveWatermarkForFuture] = useState(false);
  const [results, setResults] = useState<{ mediaId: number; success: boolean; error?: string }[]>([]);

  // Fetch saved watermark
  const { data: savedWatermark, refetch: refetchSavedWatermark } = trpc.watermark.getSavedWatermark.useQuery(
    undefined,
    { enabled: open }
  );

  const applyPermanentMutation = trpc.watermark.applyPermanent.useMutation();
  const saveWatermarkMutation = trpc.watermark.saveWatermark.useMutation();
  const deleteWatermarkMutation = trpc.watermark.deleteWatermark.useMutation();

  // Reset to use saved watermark if available
  useEffect(() => {
    if (open && savedWatermark?.watermarkUrl) {
      setUseSavedWatermark(true);
      setWatermarkPreview(savedWatermark.watermarkUrl);
    }
  }, [open, savedWatermark]);

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
    setUseSavedWatermark(false);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setWatermarkPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Apply watermark permanently to selected images
  const handleApplyWatermark = async () => {
    if (!useSavedWatermark && !watermarkFile) {
      toast.error("Please upload a watermark or use your saved watermark");
      return;
    }

    if (selectedMedia.length === 0) {
      toast.error("Please select images to watermark");
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
      let watermarkBase64: string | undefined;

      // If using a new watermark file, convert to base64
      if (!useSavedWatermark && watermarkFile) {
        watermarkBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(watermarkFile);
        });

        // Save watermark for future use if requested
        if (saveWatermarkForFuture && watermarkBase64) {
          try {
            await saveWatermarkMutation.mutateAsync({ watermarkData: watermarkBase64 });
            await refetchSavedWatermark();
            toast.success("Watermark saved for future use");
          } catch (error) {
            console.error("Failed to save watermark:", error);
            // Continue with applying watermark even if save fails
          }
        }
      }

      // Apply watermark permanently
      const result = await applyPermanentMutation.mutateAsync({
        mediaIds: photos.map(m => m.id),
        watermarkData: watermarkBase64,
        useSavedWatermark: useSavedWatermark,
        position,
        opacity,
        scale,
      });

      setResults(result.results);

      if (result.successCount > 0) {
        toast.success(`Watermark permanently applied to ${result.successCount} image${result.successCount > 1 ? "s" : ""}`);
        onWatermarkApplied?.();
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

  // Delete saved watermark
  const handleDeleteSavedWatermark = async () => {
    try {
      await deleteWatermarkMutation.mutateAsync();
      await refetchSavedWatermark();
      setUseSavedWatermark(false);
      setWatermarkPreview(null);
      toast.success("Saved watermark deleted");
    } catch (error) {
      console.error("Failed to delete watermark:", error);
      toast.error("Failed to delete saved watermark");
    }
  };

  // Reset dialog state
  const handleClose = (open: boolean) => {
    if (!open) {
      setWatermarkFile(null);
      setWatermarkPreview(null);
      setResults([]);
      setSaveWatermarkForFuture(false);
      setUseSavedWatermark(false);
    }
    onOpenChange(open);
  };

  const photoCount = selectedMedia.filter(m => m.mediaType === "photo").length;
  const successCount = results.filter(r => r.success).length;
  const hasSavedWatermark = !!savedWatermark?.watermarkUrl;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Apply Watermark
          </DialogTitle>
          <DialogDescription>
            Permanently apply your watermark to {photoCount} selected photo{photoCount !== 1 ? "s" : ""}.
            This will replace the original images with watermarked versions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Saved Watermark Option */}
          {hasSavedWatermark && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="use-saved"
                    checked={useSavedWatermark}
                    onCheckedChange={(checked) => {
                      setUseSavedWatermark(checked);
                      if (checked) {
                        setWatermarkFile(null);
                        setWatermarkPreview(savedWatermark.watermarkUrl);
                      } else {
                        setWatermarkPreview(null);
                      }
                    }}
                  />
                  <Label htmlFor="use-saved" className="cursor-pointer">
                    Use saved watermark
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteSavedWatermark}
                  disabled={deleteWatermarkMutation.isPending}
                >
                  {deleteWatermarkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {useSavedWatermark && savedWatermark.watermarkUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={savedWatermark.watermarkUrl}
                    alt="Saved watermark"
                    className="max-h-16 rounded border border-border bg-white/10 p-1"
                  />
                  <span className="text-xs text-muted-foreground">Your saved watermark</span>
                </div>
              )}
            </div>
          )}

          {/* Watermark Upload */}
          {!useSavedWatermark && (
            <div className="space-y-2">
              <Label>Watermark Image</Label>
              {watermarkPreview && !useSavedWatermark ? (
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

              {/* Save for future option */}
              {watermarkFile && (
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    id="save-watermark"
                    checked={saveWatermarkForFuture}
                    onCheckedChange={setSaveWatermarkForFuture}
                  />
                  <Label htmlFor="save-watermark" className="cursor-pointer text-sm flex items-center gap-1">
                    <Save className="h-3 w-3" />
                    Save watermark for future use
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* Position */}
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-left">Top Left (Default)</SelectItem>
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

          {/* Warning */}
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Note:</strong> This will permanently modify your images. The watermark will be 
              embedded into the stored files and cannot be removed. Make sure you have backups if needed.
            </p>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {successCount} of {results.length} processed successfully
                </span>
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
              disabled={(!useSavedWatermark && !watermarkFile) || photoCount === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Apply Permanently
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
