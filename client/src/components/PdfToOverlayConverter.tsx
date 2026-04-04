/**
 * PDF to Overlay PNG Converter
 * Converts PDF blueprints to high-contrast transparent PNG overlays
 * with preview and direct save to project media
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
import { Upload, Loader2, Download, FileText, Check, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface PdfToOverlayConverterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onConversionComplete?: (pngUrl: string, filename: string) => void;
  onOverlayCreated?: (overlayId: number) => void;
}

const COLOR_PALETTE = {
  MAPIT_GREEN: { label: "MAPIT Green", rgb: "rgb(0, 255, 136)" },
  SAFETY_ORANGE: { label: "Safety Orange", rgb: "rgb(255, 121, 0)" },
  ELECTRIC_BLUE: { label: "Electric Blue", rgb: "rgb(0, 191, 255)" },
  HOT_PINK: { label: "Hot Pink", rgb: "rgb(255, 0, 255)" },
  HI_VIZ_YELLOW: { label: "Hi-Viz Yellow", rgb: "rgb(255, 255, 0)" },
};

export function PdfToOverlayConverter({
  open,
  onOpenChange,
  projectId,
  onConversionComplete,
  onOverlayCreated,
}: PdfToOverlayConverterProps) {
  const [selectedColor, setSelectedColor] = useState<keyof typeof COLOR_PALETTE>(
    "MAPIT_GREEN"
  );
  const [whiteThreshold, setWhiteThreshold] = useState(220);
  const [dpi, setDpi] = useState(300);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file");
      return;
    }

    setSelectedFile(file);
    toast.success(`Selected: ${file.name}`);
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file first");
      return;
    }

    setIsConverting(true);
    try {
      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("lineColor", selectedColor);
      formData.append("whiteThreshold", whiteThreshold.toString());
      formData.append("dpi", dpi.toString());

      // Send to backend conversion endpoint
      const response = await fetch("/api/convert-pdf-overlay", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Conversion failed");
      }

      // Response is JSON with S3 URL
      const result = await response.json();
      const pngUrl = result.pngUrl;
      const filename = result.filename;

      toast.success("PDF converted successfully!");

      // Show preview
      setPreviewUrl(pngUrl);
      setPreviewFilename(filename);

      if (onConversionComplete) {
        onConversionComplete(pngUrl, filename);
      }
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to convert PDF"
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleSaveToMedia = async () => {
    if (!previewUrl || !previewFilename) {
      toast.error("No preview available");
      return;
    }

    setIsSaving(true);
    try {
      // Create overlay in project media
      const response = await fetch("/api/create-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileUrl: previewUrl,
          label: previewFilename.replace(".png", ""),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save overlay to project");
      }

      const result = await response.json();
      toast.success("Overlay saved to project!");

      if (onOverlayCreated && result.overlay?.id) {
        onOverlayCreated(result.overlay.id);
      }

      // Reset and close
      setPreviewUrl(null);
      setPreviewFilename("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save overlay"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setPreviewFilename("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show preview dialog if preview is available
  if (previewUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Converted Overlay</DialogTitle>
            <DialogDescription>
              Review the converted overlay before saving to project media
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview Image */}
            <div className="border rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center" style={{ height: "400px" }}>
              <img
                src={previewUrl}
                alt="Converted overlay preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* File Info */}
            <div className="text-sm text-slate-600">
              <p><strong>Filename:</strong> {previewFilename}</p>
              <p><strong>Color:</strong> {COLOR_PALETTE[selectedColor].label}</p>
              <p><strong>DPI:</strong> {dpi}</p>
              <p><strong>White Threshold:</strong> {whiteThreshold}</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveToMedia}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save to Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show conversion dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert PDF to Overlay</DialogTitle>
          <DialogDescription>
            Transform your PDF blueprint into a high-contrast transparent PNG
            overlay for Mapit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="pdf-upload">PDF Blueprint</Label>
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    Click to select PDF or drag and drop
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label htmlFor="color-select">Line Color</Label>
            <Select value={selectedColor} onValueChange={(value: any) => setSelectedColor(value)}>
              <SelectTrigger id="color-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_PALETTE).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* White Threshold Slider */}
          <div className="space-y-2">
            <Label>White Threshold: {whiteThreshold}</Label>
            <Slider
              value={[whiteThreshold]}
              onValueChange={(value) => setWhiteThreshold(value[0])}
              min={180}
              max={255}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-slate-500">
              Lower = more aggressive transparency removal
            </p>
          </div>

          {/* DPI Selection */}
          <div className="space-y-2">
            <Label htmlFor="dpi-select">Resolution (DPI)</Label>
            <Select value={dpi.toString()} onValueChange={(value) => setDpi(parseInt(value))}>
              <SelectTrigger id="dpi-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="150">150 DPI (Fast)</SelectItem>
                <SelectItem value="200">200 DPI (Balanced)</SelectItem>
                <SelectItem value="300">300 DPI (High Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              handleCancel();
            }}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={!selectedFile || isConverting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Convert
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
