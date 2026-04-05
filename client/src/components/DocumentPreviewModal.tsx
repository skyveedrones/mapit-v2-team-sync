import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, X, Download, Zap } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentPreviewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onConvertToOverlay: (document: Document) => void;
  isConverting?: boolean;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
  onConvertToOverlay,
  isConverting = false,
}: DocumentPreviewModalProps) {
  if (!document) return null;

  const fileSizeMB = (document.fileSize / (1024 * 1024)).toFixed(2);
  const uploadDate = new Date(document.uploadedAt);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {document.fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Preview */}
          <div className="bg-muted rounded-lg p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">PDF Preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                {document.fileName}
              </p>
            </div>
          </div>

          {/* Document Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">File Size</p>
              <p className="text-sm">{fileSizeMB} MB</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">File Type</p>
              <p className="text-sm">{document.mimeType}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Uploaded</p>
              <p className="text-sm">{format(uploadDate, "MMM d, yyyy")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">File Key</p>
              <p className="text-xs text-muted-foreground truncate">{document.fileKey}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
            >
              Close
            </Button>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                variant="outline"
                className="gap-2"
                disabled={isConverting}
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </a>
            <Button
              onClick={() => onConvertToOverlay(document)}
              disabled={isConverting}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              {isConverting ? "Converting..." : "Convert to Overlay"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
