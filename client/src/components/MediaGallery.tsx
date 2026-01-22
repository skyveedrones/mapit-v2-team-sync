/**
 * Media Gallery Component
 * Displays uploaded media files in a grid with preview and actions
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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  Camera,
  Calendar,
  FileImage,
  FileVideo,
  MapPin,
  Mountain,
  Trash2,
  X,
  Download,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MediaGalleryProps {
  projectId: number;
}

export function MediaGallery({ projectId }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);

  const { data: mediaList, isLoading } = trpc.media.list.useQuery({ projectId });
  const deleteMutation = trpc.media.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async () => {
    if (!mediaToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: mediaToDelete.id });
      toast.success("Media deleted successfully");
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      if (selectedMedia?.id === mediaToDelete.id) {
        setSelectedMedia(null);
      }
      // Invalidate queries
      await utils.media.list.invalidate({ projectId });
      await utils.project.get.invalidate({ id: projectId });
      await utils.project.list.invalidate();
    } catch (error) {
      toast.error("Failed to delete media");
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCoordinate = (value: string | null, type: "lat" | "lng") => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    const direction = type === "lat" ? (num >= 0 ? "N" : "S") : num >= 0 ? "E" : "W";
    return `${Math.abs(num).toFixed(6)}° ${direction}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (!mediaList || mediaList.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No media uploaded yet</p>
        <p className="text-sm">Upload drone photos and videos to see them here</p>
      </div>
    );
  }

  return (
    <>
      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaList.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedMedia(item)}
          >
            {item.mediaType === "photo" ? (
              <img
                src={item.url}
                alt={item.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <FileVideo className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Overlay with info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-medium truncate">
                  {item.filename}
                </p>
                {item.latitude && item.longitude && (
                  <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>GPS Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Media type badge */}
            <div className="absolute top-2 right-2">
              <div className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm">
                {item.mediaType === "video" ? (
                  <FileVideo className="h-4 w-4 text-white" />
                ) : (
                  <FileImage className="h-4 w-4 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Media Preview Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="truncate pr-8">
              {selectedMedia?.filename}
            </DialogTitle>
          </DialogHeader>

          {selectedMedia && (
            <div className="flex-1 overflow-auto">
              {/* Media Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                {selectedMedia.mediaType === "photo" ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.filename}
                    className="w-full max-h-[50vh] object-contain"
                  />
                ) : (
                  <video
                    src={selectedMedia.url}
                    controls
                    className="w-full max-h-[50vh]"
                  />
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* GPS Coordinates */}
                {selectedMedia.latitude && selectedMedia.longitude && (
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Location</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatCoordinate(selectedMedia.latitude, "lat")}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCoordinate(selectedMedia.longitude, "lng")}
                    </p>
                  </div>
                )}

                {/* Altitude */}
                {selectedMedia.altitude && (
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Mountain className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Altitude</span>
                    </div>
                    <p className="text-sm font-medium">
                      {parseFloat(selectedMedia.altitude).toFixed(1)} m
                    </p>
                  </div>
                )}

                {/* Capture Date */}
                {selectedMedia.capturedAt && (
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Captured</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatDate(selectedMedia.capturedAt)}
                    </p>
                  </div>
                )}

                {/* Camera Info */}
                {(selectedMedia.cameraMake || selectedMedia.cameraModel) && (
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Camera className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Camera</span>
                    </div>
                    <p className="text-sm font-medium">
                      {[selectedMedia.cameraMake, selectedMedia.cameraModel]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                )}

                {/* File Size */}
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileImage className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">File Size</span>
                  </div>
                  <p className="text-sm font-medium">
                    {(selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {/* Upload Date */}
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">Uploaded</span>
                  </div>
                  <p className="text-sm font-medium">
                    {formatDate(selectedMedia.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-border flex-shrink-0">
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                setMediaToDelete(selectedMedia);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                asChild
              >
                <a href={selectedMedia?.url} download={selectedMedia?.filename} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
              <Button variant="outline" onClick={() => setSelectedMedia(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{mediaToDelete?.filename}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
