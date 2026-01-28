/**
 * Media Upload Dialog
 * Allows users to upload drone photos and videos with drag-and-drop support
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { CheckCircle, FileImage, FileVideo, Upload, X, AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface MediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  flightId?: number;
  onUploadComplete?: () => void;
}

interface FileToUpload {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function MediaUploadDialog({
  open,
  onOpenChange,
  projectId,
  flightId,
  onUploadComplete,
}: MediaUploadDialogProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = trpc.media.upload.useMutation();
  const utils = trpc.useUtils();

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 100MB)`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const filesToAdd: FileToUpload[] = [];
    
    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file);
      filesToAdd.push({
        file,
        status: error ? "error" : "pending",
        progress: 0,
        error: error || undefined,
      });
    });

    setFiles((prev) => [...prev, ...filesToAdd]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.status !== "pending") continue;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" as const, progress: 10 } : f
        )
      );

      try {
        // Convert file to base64
        const base64Data = await fileToBase64(fileItem.file);

        // Update progress
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 50 } : f))
        );

        // Upload to server
        await uploadMutation.mutateAsync({
          projectId,
          filename: fileItem.file.name,
          mimeType: fileItem.file.type,
          fileData: base64Data,
        });

        // Mark as success
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success" as const, progress: 100 } : f
          )
        );
      } catch (error) {
        // Mark as error
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    // Invalidate queries to refresh data
    await utils.media.list.invalidate({ projectId });
    await utils.project.get.invalidate({ id: projectId });
    await utils.project.list.invalidate();

    // Check if all uploads succeeded
    const successCount = files.filter((f) => f.status === "success").length;
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
      onUploadComplete?.();
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
            Upload Media
          </DialogTitle>
          <DialogDescription>
            Upload drone photos and videos to this project. GPS coordinates will be
            automatically extracted from EXIF data.
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports JPEG, PNG, WebP, HEIC images and MP4, MOV, AVI, WebM videos (max 100MB)
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {files.map((fileItem, index) => (
              <div
                key={`${fileItem.file.name}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {fileItem.file.type.startsWith("video/") ? (
                    <FileVideo className="h-8 w-8 text-blue-500" />
                  ) : (
                    <FileImage className="h-8 w-8 text-emerald-500" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fileItem.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  {fileItem.status === "uploading" && (
                    <Progress value={fileItem.progress} className="h-1 mt-1" />
                  )}
                  {fileItem.status === "error" && fileItem.error && (
                    <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                  )}
                </div>

                {/* Status / Actions */}
                <div className="flex-shrink-0">
                  {fileItem.status === "success" && (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
                  {fileItem.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  {(fileItem.status === "pending" || fileItem.status === "error") && !isUploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {files.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {pendingCount} pending, {successCount} uploaded
              {errorCount > 0 && `, ${errorCount} failed`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {successCount > 0 && pendingCount === 0 ? "Done" : "Cancel"}
          </Button>
          {pendingCount > 0 && (
            <Button
              onClick={uploadFiles}
              disabled={isUploading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isUploading ? "Uploading..." : `Upload ${pendingCount} File(s)`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
