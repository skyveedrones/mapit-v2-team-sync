/**
 * PDF to Overlay PNG Converter
 * Converts PDF blueprints to high-contrast transparent PNG overlays
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
import { Upload, Loader2, Download, FileText } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface PdfToOverlayConverterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversionComplete?: (pngUrl: string, filename: string) => void;
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
  onConversionComplete,
}: PdfToOverlayConverterProps) {
  const [selectedColor, setSelectedColor] = useState<keyof typeof COLOR_PALETTE>(
    "MAPIT_GREEN"
  );
  const [whiteThreshold, setWhiteThreshold] = useState(220);
  const [dpi, setDpi] = useState(300);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

      const result = await response.json();

      toast.success("PDF converted successfully!");

      if (onConversionComplete) {
        onConversionComplete(result.pngUrl, result.filename);
      }

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to convert PDF"
      );
    } finally {
      setIsConverting(false);
    }
  };

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
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-slate-500">or drag and drop</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Color Selection */}
          <div className="space-y-2">
            <Label htmlFor="color-select">Line Color</Label>
            <Select
              value={selectedColor}
              onValueChange={(value: any) => setSelectedColor(value)}
            >
              <SelectTrigger id="color-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COLOR_PALETTE).map(([key, { label, rgb }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: rgb }}
                      />
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* White Threshold Slider */}
          <div className="space-y-2">
            <Label>White Background Threshold: {whiteThreshold}</Label>
            <Slider
              value={[whiteThreshold]}
              onValueChange={([value]) => setWhiteThreshold(value)}
              min={200}
              max={255}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-slate-500">
              Higher values detect more white areas. Adjust if your PDF has a
              greyish background.
            </p>
          </div>

          {/* DPI Selection */}
          <div className="space-y-2">
            <Label htmlFor="dpi-select">Resolution (DPI)</Label>
            <Select
              value={dpi.toString()}
              onValueChange={(value) => setDpi(parseInt(value))}
            >
              <SelectTrigger id="dpi-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="150">150 DPI (Smaller file)</SelectItem>
                <SelectItem value="200">200 DPI (Balanced)</SelectItem>
                <SelectItem value="300">300 DPI (Best quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={!selectedFile || isConverting}
            className="gap-2"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Convert to PNG
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
