import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
}

interface DocumentToOverlayDialogProps {
  document: Document | null;
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COLOR_OPTIONS = [
  { name: "MAPIT Green", value: "00FF88", hex: "#00FF88" },
  { name: "Safety Orange", value: "FF7900", hex: "#FF7900" },
  { name: "Electric Blue", value: "00BFFF", hex: "#00BFFF" },
  { name: "Hot Pink", value: "FF00FF", hex: "#FF00FF" },
  { name: "Hi-Viz Yellow", value: "FFFF00", hex: "#FFFF00" },
];

export function DocumentToOverlayDialog({
  document,
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: DocumentToOverlayDialogProps) {
  const [selectedColor, setSelectedColor] = useState("00FF88");
  const [whiteThreshold, setWhiteThreshold] = useState(220);
  const [dpi, setDpi] = useState(300);
  const [isConverting, setIsConverting] = useState(false);

  if (!document) return null;

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const response = await fetch("/api/convert-pdf-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl: document.fileUrl,
          projectId,
          lineColor: selectedColor,
          whiteThreshold,
          dpi,
        }),
      });

      if (!response.ok) throw new Error("Conversion failed");

      const data = await response.json();
      
      // Create overlay from converted PNG
      const overlayResponse = await fetch("/api/create-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          overlayUrl: data.overlayUrl,
          overlayKey: data.overlayKey,
          label: document.fileName.replace(/\.pdf$/i, ""),
        }),
      });

      if (!overlayResponse.ok) throw new Error("Failed to create overlay");

      // Save the converted PNG to project documents
      try {
        const uploadMutation = trpc.project.uploadDocument.useMutation();
        await uploadMutation.mutateAsync({
          projectId,
          fileName: document.fileName.replace(/\.pdf$/i, ".png"),
          fileUrl: data.overlayUrl,
          fileKey: data.overlayKey,
          fileType: "image/png",
          fileSize: 0,
          category: "converted_overlay",
        });
      } catch (error) {
        console.warn("Warning: Overlay created but document not saved to project documents", error);
      }

      toast.success("Document converted and added as overlay!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Convert to Overlay
          </DialogTitle>
          <DialogDescription>
            {document.fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Color Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Line Color</label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`h-12 rounded-lg border-2 transition-all ${
                    selectedColor === color.value
                      ? "border-white shadow-lg"
                      : "border-muted hover:border-muted-foreground"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* White Threshold Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">White Threshold</label>
              <span className="text-sm text-muted-foreground">{whiteThreshold}</span>
            </div>
            <input
              type="range"
              min={200}
              max={255}
              step={1}
              value={whiteThreshold}
              onChange={(e) => setWhiteThreshold(parseInt(e.target.value))}
              disabled={isConverting}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher values remove more white areas
            </p>
          </div>

          {/* DPI Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution (DPI)</label>
            <div className="grid grid-cols-3 gap-2">
              {[150, 200, 300].map((d) => (
                <button
                  key={d}
                  onClick={() => setDpi(d)}
                  disabled={isConverting}
                  className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                    dpi === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted hover:border-muted-foreground"
                  }`}
                >
                  {d} DPI
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={isConverting}
              className="gap-2"
            >
              {isConverting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isConverting ? "Converting..." : "Convert & Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
