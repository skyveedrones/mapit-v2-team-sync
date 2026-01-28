/**
 * Media Gallery Component
 * Displays uploaded media files in a grid with preview and actions
 * Includes Action dropdown with Upload, Download, Watermark, Delete, and Sort options
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Download,
  FileImage,
  FileVideo,
  ImagePlus,
  MapPin,
  Mountain,
  SortAsc,
  SortDesc,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { WatermarkDialog } from "./WatermarkDialog";

interface MediaGalleryProps {
  projectId: number;
  canEdit?: boolean;
  onUploadClick?: () => void;
}

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "size-asc" | "size-desc";

export function MediaGallery({ projectId, canEdit = true, onUploadClick }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [watermarkDialogOpen, setWatermarkDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const { data: mediaList, isLoading } = trpc.media.list.useQuery({ projectId });
  const deleteMutation = trpc.media.delete.useMutation();
  const utils = trpc.useUtils();

  // Sort media based on selected option
  const sortedMedia = useMemo(() => {
    if (!mediaList) return [];
    const sorted = [...mediaList];
    
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "name-asc":
        return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
      case "name-desc":
        return sorted.sort((a, b) => b.filename.localeCompare(a.filename));
      case "size-asc":
        return sorted.sort((a, b) => a.fileSize - b.fileSize);
      case "size-desc":
        return sorted.sort((a, b) => b.fileSize - a.fileSize);
      default:
        return sorted;
    }
  }, [mediaList, sortBy]);

  // Get selected media items
  const selectedMediaItems = useMemo(() => {
    return sortedMedia.filter(m => selectedIds.has(m.id));
  }, [sortedMedia, selectedIds]);

  // Toggle selection
  const toggleSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedMedia.map(m => m.id)));
    }
  };

  // Handle single delete
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
      selectedIds.delete(mediaToDelete.id);
      setSelectedIds(new Set(selectedIds));
      // Invalidate queries
      await utils.media.list.invalidate({ projectId });
      await utils.project.get.invalidate({ id: projectId });
      await utils.project.list.invalidate();
    } catch (error) {
      toast.error("Failed to delete media");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToDelete) {
      try {
        await deleteMutation.mutateAsync({ id });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} item${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} item${failCount > 1 ? "s" : ""}`);
    }

    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
    await utils.media.list.invalidate({ projectId });
    await utils.project.get.invalidate({ id: projectId });
    await utils.project.list.invalidate();
  };

  // Download selected media
  const handleDownloadSelected = () => {
    selectedMediaItems.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
    toast.success(`Downloading ${selectedMediaItems.length} file${selectedMediaItems.length > 1 ? "s" : ""}`);
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

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case "newest": return "Newest First";
      case "oldest": return "Oldest First";
      case "name-asc": return "Name (A-Z)";
      case "name-desc": return "Name (Z-A)";
      case "size-asc": return "Size (Smallest)";
      case "size-desc": return "Size (Largest)";
    }
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
        <p className="text-sm mb-4">Upload drone photos and videos to see them here</p>
        {canEdit && onUploadClick && (
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        )}
      </div>
    );
  }

  const photoCount = selectedMediaItems.filter(m => m.mediaType === "photo").length;

  return (
    <>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === sortedMedia.length ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Select All
                </>
              )}
            </Button>
          )}
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                {getSortLabel(sortBy)}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                <SortDesc className="h-4 w-4 mr-2" />
                Newest First
                {sortBy === "newest" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                <SortAsc className="h-4 w-4 mr-2" />
                Oldest First
                {sortBy === "oldest" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("name-asc")}>
                <ArrowDownAZ className="h-4 w-4 mr-2" />
                Name (A-Z)
                {sortBy === "name-asc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-desc")}>
                <ArrowUpAZ className="h-4 w-4 mr-2" />
                Name (Z-A)
                {sortBy === "name-desc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("size-asc")}>
                <SortAsc className="h-4 w-4 mr-2" />
                Size (Smallest)
                {sortBy === "size-asc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("size-desc")}>
                <SortDesc className="h-4 w-4 mr-2" />
                Size (Largest)
                {sortBy === "size-desc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action Dropdown */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  Action
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onUploadClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Media
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDownloadSelected}
                  disabled={selectedIds.size === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected ({selectedIds.size})
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWatermarkDialogOpen(true)}
                  disabled={photoCount === 0}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Watermark Photos ({photoCount})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={selectedIds.size === 0}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedIds.size})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Click on any image to view details and metadata. 
          {canEdit && " Use checkboxes to select multiple items, then use the Action menu to download, watermark, or delete them in bulk."}
          {" "}Images with GPS data will appear on the project map.
        </p>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedMedia.map((item) => (
          <div
            key={item.id}
            className={`group relative aspect-square rounded-lg overflow-hidden bg-card border cursor-pointer transition-all ${
              selectedIds.has(item.id)
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
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

            {/* Selection Checkbox */}
            {canEdit && (
              <div
                className={`absolute top-2 left-2 transition-opacity ${
                  selectedIds.has(item.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => toggleSelection(item.id, e)}
              >
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  selectedIds.has(item.id)
                    ? "bg-primary border-primary"
                    : "bg-background/80 border-border backdrop-blur-sm"
                }`}>
                  {selectedIds.has(item.id) && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>
              </div>
            )}

            {/* Overlay with info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
            {canEdit ? (
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
            ) : (
              <div />
            )}
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected item{selectedIds.size > 1 ? "s" : ""}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : `Delete ${selectedIds.size} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Watermark Dialog */}
      <WatermarkDialog
        open={watermarkDialogOpen}
        onOpenChange={setWatermarkDialogOpen}
        selectedMedia={selectedMediaItems}
        projectId={projectId}
      />
    </>
  );
}
