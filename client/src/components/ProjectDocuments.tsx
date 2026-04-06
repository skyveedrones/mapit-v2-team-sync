import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Download, Trash2, FileText, Upload, MapPin, Eye, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DocumentToOverlayDialog } from "./DocumentToOverlayDialog";

interface ProjectDocumentsProps {
  projectId: number;
}

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [conversionDoc, setConversionDoc] = useState<any>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project documents
  const { data: documents = [], isLoading, error, refetch } = trpc.project.getDocuments.useQuery(
    { projectId },
    { 
      enabled: !!projectId,
      retry: false
    }
  );

  // Handle missing table gracefully
  if (error && error.message && error.message.includes('project_documents')) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Project Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Project Documents feature is being initialized. Please refresh the page in a moment.</p>
        </CardContent>
      </Card>
    );
  }

  // Upload document mutation
  const uploadMutation = trpc.project.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully!");
      refetch();
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
      setIsUploading(false);
    },
  });

  // Delete document mutation
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload PDF, Word, Excel, or image files.");
      return;
    }

    setIsUploading(true);
    toast.info("Document upload feature coming soon");
    setIsUploading(false);
  };

  const handlePreviewClick = (doc: any) => {
    setPreviewDoc(doc);
  };

  const handleConvertClick = (doc: any) => {
    setConversionDoc(doc);
  };

  const handleDeleteClick = (doc: any) => {
    setDeleteConfirmDoc(doc);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmDoc) {
      deleteMutation.mutate({ documentId: deleteConfirmDoc.id });
    }
  };

  const handleConvertSuccess = () => {
    setPreviewDoc(null);
    setConversionDoc(null);
    refetch();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes("pdf")) return "📄";
    if (fileType?.includes("word") || fileType?.includes("document")) return "📝";
    if (fileType?.includes("sheet") || fileType?.includes("excel")) return "📊";
    if (fileType?.includes("image")) return "🖼️";
    return "📎";
  };

  const isPdfOrImage = (fileType: string) => {
    return fileType?.includes("pdf") || fileType?.includes("image");
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading documents...</div>;
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
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
          />
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-2">Upload blueprints, permits, or other project files</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  {/* Left side - File icon and metadata */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  {/* Right side - Document Actions dropdown */}
                  <div className="flex-shrink-0 ml-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                          Document Actions
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Use as Map Overlay - only for PDF and image files */}
                        {isPdfOrImage(doc.fileType) && (
                          <>
                            <DropdownMenuItem onClick={() => handleConvertClick(doc)}>
                              <MapPin className="h-4 w-4 mr-2" />
                              Use as Map Overlay
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {/* Preview */}
                        <DropdownMenuItem onClick={() => handlePreviewClick(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>

                        {/* Download */}
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contents"
                        >
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        </a>

                        {/* Delete */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(doc)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onConvertToOverlay={handleConvertClick}
      />

      {/* Conversion Dialog */}
      <DocumentToOverlayDialog
        document={conversionDoc}
        projectId={projectId}
        isOpen={!!conversionDoc}
        onClose={() => setConversionDoc(null)}
        onSuccess={handleConvertSuccess}
      />
    </>
  );
}
