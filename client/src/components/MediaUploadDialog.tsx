/**
 * Media Upload Dialog
 * Allows users to upload drone photos and videos with drag-and-drop support
 * Features: detailed progress with speed/ETA, video compression, auto thumbnail extraction
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  CheckCircle, 
  FileImage, 
  FileVideo, 
  Upload, 
  X, 
  AlertCircle,
  Loader2,
  Zap,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";
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
  status: "pending" | "compressing" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  compressedFile?: File;
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
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320);
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

// Compress video using browser's MediaRecorder (basic compression)
async function compressVideo(
  file: File, 
  onProgress: (progress: number) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = async () => {
      try {
        // Create a canvas to draw video frames
        const canvas = document.createElement("canvas");
        // Reduce resolution for compression (max 1080p)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        
        // Use MediaRecorder for compression
        const stream = canvas.captureStream(30);
        
        // Try to get audio from video
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        } catch {
          // No audio or audio extraction failed, continue without audio
        }
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality compression
        });
        
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const compressedFile = new File(
            [blob], 
            file.name.replace(/\.[^.]+$/, ".webm"),
            { type: "video/webm" }
          );
          URL.revokeObjectURL(video.src);
          resolve(compressedFile);
        };
        
        mediaRecorder.onerror = () => {
          URL.revokeObjectURL(video.src);
          reject(new Error("Video compression failed"));
        };
        
        // Start recording
        mediaRecorder.start(100);
        video.play();
        
        // Draw frames to canvas
        const drawFrame = () => {
          if (video.paused || video.ended) {
            mediaRecorder.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          const progress = (video.currentTime / video.duration) * 100;
          onProgress(progress);
          requestAnimationFrame(drawFrame);
        };
        
        drawFrame();
        
      } catch (err) {
        URL.revokeObjectURL(video.src);
        reject(err);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video for compression"));
    };
    
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
  const [compressVideos, setCompressVideos] = useState(false);
  const [extractThumbnails, setExtractThumbnails] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadMutation = trpc.media.upload.useMutation();
  const utils = trpc.useUtils();

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 1GB)`;
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
      
      // Extract thumbnail for videos
      if (!error && file.type.startsWith("video/") && extractThumbnails) {
        const thumbnail = await extractVideoThumbnail(file);
        if (thumbnail) {
          fileItem.thumbnail = thumbnail;
        }
      }
      
      filesToAdd.push(fileItem);
    }

    setFiles((prev) => [...prev, ...filesToAdd]);
  }, [extractThumbnails]);

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

      let fileToUpload = fileItem.file;
      
      // Compress video if enabled
      if (compressVideos && fileItem.file.type.startsWith("video/")) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "compressing" as const, progress: 0 } : f
          )
        );
        
        try {
          fileToUpload = await compressVideo(fileItem.file, (progress) => {
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, progress } : f
              )
            );
          });
          
          // Update with compressed file
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, compressedFile: fileToUpload } : f
            )
          );
          
          toast.success(`Compressed ${fileItem.file.name}: ${formatBytes(fileItem.file.size)} → ${formatBytes(fileToUpload.size)}`);
        } catch (err) {
          console.error("Compression failed:", err);
          toast.error(`Compression failed for ${fileItem.file.name}, uploading original`);
          fileToUpload = fileItem.file;
        }
      }

      // Update status to uploading
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
        // Convert file to base64 with progress tracking
        const base64Data = await fileToBase64WithProgress(
          fileToUpload,
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

        // Update progress for upload phase
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 60 } : f))
        );

        // Upload to server
        await uploadMutation.mutateAsync({
          projectId,
          filename: fileToUpload.name,
          mimeType: fileToUpload.type,
          fileData: base64Data,
          thumbnailData: fileItem.thumbnail?.split(",")[1], // Send thumbnail if available
        });

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
  const hasVideos = files.some((f) => f.file.type.startsWith("video/") && f.status === "pending");

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

        {/* Options for videos */}
        {hasVideos && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compress-videos" className="text-sm font-medium">
                  Compress Videos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reduce file size (may take a while for large videos)
                </p>
              </div>
              <Switch
                id="compress-videos"
                checked={compressVideos}
                onCheckedChange={setCompressVideos}
                disabled={isUploading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="extract-thumbnails" className="text-sm font-medium">
                  Extract Thumbnails
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate preview images from videos
                </p>
              </div>
              <Switch
                id="extract-thumbnails"
                checked={extractThumbnails}
                onCheckedChange={setExtractThumbnails}
                disabled={isUploading}
              />
            </div>
          </div>
        )}

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
            Supports JPEG, PNG, WebP, HEIC images and MP4, MOV, AVI, WebM videos (max 1GB)
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
                {/* File Icon / Thumbnail */}
                <div className="flex-shrink-0">
                  {fileItem.thumbnail ? (
                    <img 
                      src={fileItem.thumbnail} 
                      alt="Video thumbnail"
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : fileItem.file.type.startsWith("video/") ? (
                    <FileVideo className="h-8 w-8 text-blue-500" />
                  ) : (
                    <FileImage className="h-8 w-8 text-emerald-500" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(fileItem.compressedFile?.size || fileItem.file.size)}</span>
                    {fileItem.compressedFile && (
                      <span className="text-emerald-500">
                        (saved {formatBytes(fileItem.file.size - fileItem.compressedFile.size)})
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar with details */}
                  {(fileItem.status === "uploading" || fileItem.status === "compressing") && (
                    <div className="mt-1 space-y-1">
                      <Progress value={fileItem.progress} className="h-1.5" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {fileItem.status === "compressing" ? (
                            <>
                              <Zap className="h-3 w-3" />
                              Compressing...
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              {fileItem.uploadSpeed ? formatBytes(fileItem.uploadSpeed) + "/s" : "Starting..."}
                            </>
                          )}
                        </span>
                        {fileItem.eta !== undefined && fileItem.eta > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(fileItem.eta)} remaining
                          </span>
                        )}
                      </div>
                    </div>
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
                  {(fileItem.status === "uploading" || fileItem.status === "compressing") && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
