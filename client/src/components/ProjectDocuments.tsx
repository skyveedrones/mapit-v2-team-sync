import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Trash2, FileText, Upload, MapPin, Eye, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ProjectDocumentsProps {
  projectId: number;
  mapInstance?: any; // Mapbox GL instance
  projectCenter?: { lat: number; lng: number };
}

interface DocumentRecord {
  id: number;
  projectId: number;
  fileName: string;
  fileKey: string;
  fileType: string;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ProjectDocuments({ projectId, mapInstance, projectCenter }: ProjectDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [isProcessingOverlay, setIsProcessingOverlay] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading, refetch } = trpc.project.getDocuments.useQuery(
    { projectId },
    { enabled: !!projectId, retry: false }
  );

  const uploadMutation = trpc.project.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully!");
      refetch();
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const deleteMutation = trpc.project.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      setDeleteConfirmDoc(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete document");
      setDeleteConfirmDoc(null);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "application/octet-stream", // .las/.laz
    ];

    const validFiles = Array.from(files).filter(f =>
      allowedTypes.includes(f.type) ||
      f.name.endsWith(".las") ||
      f.name.endsWith(".laz")
    );
    const invalidCount = files.length - validFiles.length;
    if (invalidCount > 0) toast.error(`${invalidCount} file(s) skipped - unsupported type`);
    if (validFiles.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < validFiles.length; i++) {
      setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100));
      const file = validFiles[i];
      const ext = file.name.split(".").pop() || "bin";
      const fileKey = `projects/${projectId}/documents/${Date.now()}-${file.name}`;
      await uploadMutation.mutateAsync({
        projectId,
        fileName: file.name,
        fileKey,
        fileType: ext,
      });
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  const getFileIcon = (fileType: string) => {
    if (!fileType) return "📎";
    const t = fileType.toLowerCase();
    if (t === "pdf") return "📄";
    if (t === "doc" || t === "docx") return "📝";
    if (t === "xls" || t === "xlsx") return "📊";
    if (t === "png" || t === "jpg" || t === "jpeg") return "🖼️";
    if (t === "las" || t === "laz") return "🌐";
    return "📎";
  };

  const isPdfOrImage = (fileType: string) => {
    const t = (fileType || "").toLowerCase();
    return t === "pdf" || t === "png" || t === "jpg" || t === "jpeg";
  };

  const generateDocumentUrl = (fileKey: string) => {
    // Generate a signed/public URL for the document from S3
    // This assumes the storage system provides a way to get URLs from fileKeys
    return `/api/documents/view?key=${encodeURIComponent(fileKey)}`;
  };

  const handlePreviewClick = (doc: DocumentRecord) => {
    if (doc.fileType.toLowerCase() === "pdf") {
      setPreviewDoc(doc);
    } else {
      toast.info("Preview is available for PDF files only");
    }
  };

  const convertMutation = trpc.project.convertDocumentToPng.useMutation();

  const handleMapOverlayClick = async (doc: DocumentRecord) => {
    if (!mapInstance) {
      toast.error("Map is not available");
      return;
    }

    if (!isPdfOrImage(doc.fileType)) {
      toast.error("Map overlay is only available for PDF and image files");
      return;
    }

    setIsProcessingOverlay(true);
    toast.loading("Processing overlay...");

    try {
      // Call backend to convert PDF to PNG
      const result = await convertMutation.mutateAsync({
        fileKey: doc.fileKey,
        fileName: doc.fileName,
      });

      const { imageUrl } = result;

      // Calculate bounding box from project center
      const center = projectCenter || { lat: 32.7767, lng: -96.797 }; // Dallas default
      const latOffset = 0.01; // ~1km
      const lngOffset = 0.01;

      const coordinates: [number, number][] = [
        [center.lng - lngOffset, center.lat + latOffset], // top-left
        [center.lng + lngOffset, center.lat + latOffset], // top-right
        [center.lng + lngOffset, center.lat - latOffset], // bottom-right
        [center.lng - lngOffset, center.lat - latOffset], // bottom-left
      ];

      // Add image source to map
      const sourceId = `overlay-${doc.id}`;
      const layerId = `overlay-layer-${doc.id}`;

      // Remove existing source/layer if present
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeLayer(layerId);
        mapInstance.removeSource(sourceId);
      }

      mapInstance.addSource(sourceId, {
        type: "image",
        url: imageUrl,
        coordinates: coordinates,
      });

      mapInstance.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": 0.7,
          },
        },
        "water" // Insert before water layer for proper layering
      );

      toast.dismiss();
      toast.success(`Overlay "${doc.fileName}" added to map`);
      setIsProcessingOverlay(false);
    } catch (error: any) {
      toast.dismiss();
      const errorMsg = error?.message || error?.toString?.() || "Failed to add overlay to map";
      toast.error(errorMsg);
      setIsProcessingOverlay(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    return (documents as DocumentRecord[]).filter(doc =>
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const getStatusBadge = (status: string | null) => {
    if (!status || status === "uploaded") return { label: "Uploaded", color: "bg-blue-100 text-blue-800" };
    if (status === "processing") return { label: "Processing", color: "bg-yellow-100 text-yellow-800" };
    if (status === "processed") return { label: "Processed", color: "bg-green-100 text-green-800" };
    return { label: status, color: "bg-gray-100 text-gray-800" };
  };

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Project Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Project Documents
          </CardTitle>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload Documents"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.las,.laz"
            multiple
            className="hidden"
          />
        </CardHeader>

        <CardContent>
          {isUploading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {documents.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              {filteredDocuments.length !== documents.length && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {filteredDocuments.length} of {documents.length} documents
                </p>
              )}
            </div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-2">Upload blueprints, permits, point clouds, or other project files</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No documents match your search</p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-primary hover:underline mt-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const statusBadge = getStatusBadge(doc.status);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate text-sm">{doc.fileName}</p>
                          <Badge className={`flex-shrink-0 text-xs ${statusBadge.color}`}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground uppercase">{doc.fileType}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-2" disabled={isProcessingOverlay}>
                            Document Actions
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isPdfOrImage(doc.fileType) && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleMapOverlayClick(doc)}
                                disabled={isProcessingOverlay}
                              >
                                {isProcessingOverlay ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Use as Map Overlay
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handlePreviewClick(doc)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Download coming soon")}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmDoc(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-4 pb-2">
            <DialogTitle>{previewDoc?.fileName}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={generateDocumentUrl(previewDoc.fileKey)}
                width="100%"
                height="600px"
                className="border-0"
                title={previewDoc.fileName}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmDoc?.fileName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmDoc && deleteMutation.mutate({ documentId: deleteConfirmDoc.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
