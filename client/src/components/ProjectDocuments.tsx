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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// APWA standard utility color palette
const APWA_COLORS = [
  { label: "Potable Water",    hex: "#0000FF", preview: "#0000FF" },
  { label: "Sewers / Drain",   hex: "#00FF00", preview: "#00CC00" },
  { label: "Electric",         hex: "#FF0000", preview: "#FF0000" },
  { label: "Gas / Oil",        hex: "#FFFF00", preview: "#CCCC00" },
  { label: "Comm / Signal",    hex: "#FF8C00", preview: "#FF8C00" },
  { label: "Survey",           hex: "#FF1493", preview: "#FF1493" },
  { label: "Excavation",       hex: "#FFFFFF", preview: "#AAAAAA" },
  { label: "Reclaimed Water",  hex: "#A020F0", preview: "#A020F0" },
];
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Trash2, FileText, Upload, MapPin, Eye, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState as useStateAlias } from "react";

// Separate component so the tRPC query only fires when a doc is actually being previewed
function DocumentPreviewDialog({ doc, onClose }: { doc: { id: number; fileName: string; fileType: string }; onClose: () => void }) {
  const { data, isLoading, error } = trpc.project.getDocumentPreviewUrl.useQuery(
    { documentId: doc.id },
    { retry: false }
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle>{doc.fileName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden" style={{ minHeight: 600 }}>
          {isLoading && (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-[600px] text-destructive">
              Failed to load preview: {error.message}
            </div>
          )}
          {data?.url && (
            <iframe
              src={data.url}
              width="100%"
              height="600px"
              className="border-0"
              title={doc.fileName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectDocumentsProps {
  projectId: number;
  mapInstance?: any;
  projectCenter?: { lat: number; lng: number };
  onOverlayAdded?: (overlayId?: number, overlayData?: any) => void;
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

export function ProjectDocuments({ projectId, mapInstance, projectCenter, onOverlayAdded }: ProjectDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [isProcessingOverlay, setIsProcessingOverlay] = useState(false);
  // APWA color selector modal state
  const [apwaModalDoc, setApwaModalDoc] = useState<DocumentRecord | null>(null);
  const [selectedApwaColor, setSelectedApwaColor] = useState(APWA_COLORS[0].hex);
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
    try {
      for (let i = 0; i < validFiles.length; i++) {
        setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100));
        const file = validFiles[i];
        // Upload file bytes to S3 via the document upload endpoint (sanitizes key server-side)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", String(projectId));
        const res = await fetch("/api/document/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Upload failed (${res.status}): ${text}`);
        }
      }
      toast.success(validFiles.length === 1 ? "Document uploaded successfully!" : `${validFiles.length} documents uploaded!`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  const handlePreviewClick = (doc: DocumentRecord) => {
    if (doc.fileType.toLowerCase() === "pdf") {
      setPreviewDoc(doc);
    } else {
      toast.info("Preview is available for PDF files only");
    }
  };

  const convertMutation = trpc.project.convertDocumentToPng.useMutation();

  // Opens the APWA color selector modal for PDF/image docs
  const handleMapOverlayClick = (doc: DocumentRecord) => {
    if (!isPdfOrImage(doc.fileType)) {
      toast.error("Map overlay is only available for PDF and image files");
      return;
    }
    setSelectedApwaColor(APWA_COLORS[0].hex);
    setApwaModalDoc(doc);
  };

  // Called when user confirms color and clicks "Process"
  const handleApwaProcess = async () => {
    if (!apwaModalDoc) return;
    const doc = apwaModalDoc;
    setApwaModalDoc(null);
    setIsProcessingOverlay(true);
    const toastId = "overlay-processing";
    const colorEntry = APWA_COLORS.find(c => c.hex === selectedApwaColor);
    const overlayLabel = colorEntry
      ? `${colorEntry.label} \u2014 ${doc.fileName.replace(/\.[^.]+$/, '')}`
      : `Doc: ${doc.fileName.replace(/\.[^.]+$/, '')}`;
    toast.loading(`Converting with ${colorEntry?.label ?? "selected color"}\u2026`, { id: toastId });
    try {
      const result = await convertMutation.mutateAsync({
        fileKey: doc.fileKey,
        fileName: doc.fileName,
        projectId,
        colorCode: selectedApwaColor,
        overlayLabel,
      });
      toast.success(`Overlay "${doc.fileName}" added to map.`, { id: toastId });
      onOverlayAdded?.(result.overlayId ?? undefined, result.overlay ?? undefined);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to add overlay to map";
      toast.error(errorMsg, { id: toastId });
    } finally {
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

      {/* APWA Color Selector Modal */}
      <Dialog open={!!apwaModalDoc} onOpenChange={(open) => !open && setApwaModalDoc(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Utility Type (APWA Color)</DialogTitle>
            <DialogDescription>
              Choose the utility type to color-code this drawing before adding it to the map.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="apwa-color-select">Utility Type</Label>
              <Select value={selectedApwaColor} onValueChange={setSelectedApwaColor}>
                <SelectTrigger id="apwa-color-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APWA_COLORS.map((c) => (
                    <SelectItem key={c.hex} value={c.hex}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded-sm border border-border flex-shrink-0"
                          style={{ backgroundColor: c.preview }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <span
                className="w-8 h-8 rounded border border-border flex-shrink-0"
                style={{ backgroundColor: APWA_COLORS.find(c => c.hex === selectedApwaColor)?.preview ?? selectedApwaColor }}
              />
              <div className="text-sm">
                <p className="font-medium">{APWA_COLORS.find(c => c.hex === selectedApwaColor)?.label}</p>
                <p className="text-muted-foreground text-xs">{apwaModalDoc?.fileName}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApwaModalDoc(null)}>Cancel</Button>
            <Button onClick={handleApwaProcess}>
              Process &amp; Add to Map
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      {previewDoc && (
        <DocumentPreviewDialog
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

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
