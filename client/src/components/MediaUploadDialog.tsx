/**
 * Media Upload Dialog
 * Allows users to upload drone photos and videos with drag-and-drop support
 * Features: detailed progress with speed/ETA, direct S3 upload for large files, auto thumbnail extraction
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
import { 
  CheckCircle, 
  FileImage, 
  FileVideo, 
  Upload, 
  X, 
  AlertCircle,
  Loader2,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { useCallback, useState, useRef } from "react";
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
  thumbnail?: string; // base64 thumbnail for videos
  uploadSpeed?: number; // bytes per second
  eta?: number; // seconds remaining
  startTime?: number;
  bytesUploaded?: number;
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

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const DIRECT_UPLOAD_THRESHOLD = 50 * 1024 * 1024; // 50MB - use direct S3 upload for files larger than this

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Format seconds to human readable time
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// Extract thumbnail from video
async function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      // Seek to 1 second or 10% of video, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    
    video.onseeked = () => {
      canvas.width = 320;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320) || 180;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
        URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      } catch {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
    
    // Timeout after 10 seconds
    setTimeout(() => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    }, 10000);
    
    video.src = URL.createObjectURL(file);
  });
}

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadMutation = trpc.media.upload.useMutation();
  const getUploadUrlMutation = trpc.media.getUploadUrl.useMutation();
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation();
  const utils = trpc.useUtils();

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${formatBytes(file.size)} (max 1GB)`;
    }
    return null;
  };

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const filesToAdd: FileToUpload[] = [];
    
    for (const file of Array.from(newFiles)) {
      const error = validateFile(file);
      const fileItem: FileToUpload = {
        file,
        status: error ? "error" : "pending",
        progress: 0,
        error: error || undefined,
      };
      
      // Extract thumbnail for videos (only for smaller videos to avoid memory issues)
      if (!error && file.type.startsWith("video/") && file.size < 500 * 1024 * 1024) {
        const thumbnail = await extractVideoThumbnail(file);
        if (thumbnail) {
          fileItem.thumbnail = thumbnail;
        }
      }
      
      filesToAdd.push(fileItem);
    }

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

  // Upload file directly to S3 using presigned URL (for large files)
  const uploadDirectToS3 = async (
    file: File,
    uploadUrl: string,
    onProgress: (loaded: number, total: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.ontimeout = () => reject(new Error("Upload timed out"));
      
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  // Upload thumbnail to S3
  const uploadThumbnailToS3 = async (
    thumbnailData: string,
    uploadUrl: string
  ): Promise<void> => {
    // Convert base64 to blob
    const base64Data = thumbnailData.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/jpeg" });
    
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    
    if (!response.ok) {
      throw new Error("Failed to upload thumbnail");
    }
  };

  // Convert file to base64 with progress (for smaller files)
  const fileToBase64WithProgress = (
    file: File, 
    onProgress: (loaded: number, total: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      };
      
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.status !== "pending") continue;

      const startTime = Date.now();
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { 
            ...f, 
            status: "uploading" as const, 
            progress: 0,
            startTime,
            bytesUploaded: 0
          } : f
        )
      );

      try {
        const useDirectUpload = fileItem.file.size > DIRECT_UPLOAD_THRESHOLD;
        
        if (useDirectUpload) {
          // Large file: use direct S3 upload
          const uploadInfo = await getUploadUrlMutation.mutateAsync({
            projectId,
            filename: fileItem.file.name,
            mimeType: fileItem.file.type,
            fileSize: fileItem.file.size,
          });

          // Upload file directly to S3
          await uploadDirectToS3(
            fileItem.file,
            uploadInfo.uploadUrl,
            (loaded, total) => {
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = loaded / elapsed;
              const remaining = total - loaded;
              const eta = remaining / speed;
              const progress = (loaded / total) * 90; // 90% for upload
              
              setFiles((prev) =>
                prev.map((f, idx) =>
                  idx === i ? { 
                    ...f, 
                    progress,
                    uploadSpeed: speed,
                    eta,
                    bytesUploaded: loaded
                  } : f
                )
              );
            }
          );

          // Upload thumbnail if available
          let thumbnailUrl: string | null = null;
          if (fileItem.thumbnail) {
            try {
              await uploadThumbnailToS3(fileItem.thumbnail, uploadInfo.thumbnailUploadUrl);
              thumbnailUrl = uploadInfo.thumbnailPublicUrl;
            } catch (err) {
              console.warn("Failed to upload thumbnail:", err);
            }
          }

          // Confirm upload in database
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress: 95 } : f))
          );

          await confirmUploadMutation.mutateAsync({
            projectId,
            filename: fileItem.file.name,
            mimeType: fileItem.file.type,
            fileSize: fileItem.file.size,
            fileKey: uploadInfo.fileKey,
            url: uploadInfo.publicUrl,
            thumbnailUrl,
          });
        } else {
          // Small file: use base64 upload through server
          const base64Data = await fileToBase64WithProgress(
            fileItem.file,
            (loaded, total) => {
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = loaded / elapsed;
              const remaining = total - loaded;
              const eta = remaining / speed;
              const progress = (loaded / total) * 50; // First 50% is reading
              
              setFiles((prev) =>
                prev.map((f, idx) =>
                  idx === i ? { 
                    ...f, 
                    progress,
                    uploadSpeed: speed,
                    eta,
                    bytesUploaded: loaded
                  } : f
                )
              );
            }
          );

          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress: 60 } : f))
          );

          await uploadMutation.mutateAsync({
            projectId,
            filename: fileItem.file.name,
            mimeType: fileItem.file.type,
            fileData: base64Data,
            thumbnailData: fileItem.thumbnail?.split(",")[1],
          });
        }

        // Mark as success
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { 
              ...f, 
              status: "success" as const, 
              progress: 100,
              uploadSpeed: undefined,
              eta: undefined
            } : f
          )
        );
      } catch (error) {
        console.error("Upload error:", error);
        // Mark as error
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                  uploadSpeed: undefined,
                  eta: undefined
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    abortControllerRef.current = null;

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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            Upload drone photos and videos. GPS data will be extracted automatically from images.
            Videos up to 1GB supported.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Supports JPEG, PNG, WebP, HEIC images and MP4, MOV, AVI, WebM videos (max 1GB)
            </p>
            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" asChild disabled={isUploading}>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Files ({files.length})
                </h4>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles([])}
                    className="text-muted-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-auto">
                {files.map((fileItem, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                  >
                    {/* Thumbnail or Icon */}
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {fileItem.thumbnail ? (
                        <img 
                          src={fileItem.thumbnail} 
                          alt="Video thumbnail" 
                          className="w-full h-full object-cover"
                        />
                      ) : fileItem.file.type.startsWith("image/") ? (
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <FileVideo className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatBytes(fileItem.file.size)}</span>
                        {fileItem.file.size > DIRECT_UPLOAD_THRESHOLD && (
                          <span className="text-blue-500">(Direct upload)</span>
                        )}
                        {fileItem.uploadSpeed && fileItem.status === "uploading" && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" />
                              {formatBytes(fileItem.uploadSpeed)}/s
                            </span>
                            {fileItem.eta && fileItem.eta > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(fileItem.eta)} left
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {fileItem.status === "uploading" && (
                        <Progress value={fileItem.progress} className="h-1 mt-2" />
                      )}

                      {/* Error Message */}
                      {fileItem.error && (
                        <p className="text-xs text-destructive mt-1">
                          {fileItem.error}
                        </p>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {fileItem.status === "pending" && !isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {fileItem.status === "uploading" && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {fileItem.status === "success" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {fileItem.status === "error" && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {pendingCount > 0 && `${pendingCount} pending`}
            {successCount > 0 && ` • ${successCount} uploaded`}
            {errorCount > 0 && ` • ${errorCount} failed`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Close"}
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={pendingCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
