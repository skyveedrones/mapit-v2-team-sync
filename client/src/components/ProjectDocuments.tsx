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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Trash2, FileText, Upload, MapPin, Eye, ChevronDown, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DocumentToOverlayDialog } from "./DocumentToOverlayDialog";

interface ProjectDocumentsProps {
  projectId: number;
}

const DOCUMENT_CATEGORIES = [
  { value: "blueprint", label: "Blueprint", color: "bg-blue-100 text-blue-800" },
  { value: "permit", label: "Permit", color: "bg-green-100 text-green-800" },
  { value: "contract", label: "Contract", color: "bg-purple-100 text-purple-800" },
  { value: "site_plan", label: "Site Plan", color: "bg-orange-100 text-orange-800" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
];

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  // All hooks MUST be called unconditionally at the top level
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [conversionDoc, setConversionDoc] = useState<any>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project documents
  const { data: documents = [], isLoading, error, refetch } = trpc.project.getDocuments.useQuery(
    { projectId },
    { 
      enabled: !!projectId,
      retry: false
    }
  );

  // Upload document mutation
  const uploadMutation = trpc.project.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully!");
      refetch();
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
      setIsUploading(false);
      setUploadProgress(0);
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

  // Handler functions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
    ];

    const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
    const invalidCount = files.length - validFiles.length;

    if (invalidCount > 0) {
      toast.error(`${invalidCount} file(s) skipped - unsupported type`);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const totalFiles = validFiles.length;

    // Simulate batch upload with progress
    for (let i = 0; i < totalFiles; i++) {
      const progress = Math.round(((i + 1) / totalFiles) * 100);
      setUploadProgress(progress);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    toast.info(`Batch upload feature: ${validFiles.length} file(s) ready to upload`);
    setIsUploading(false);
    setUploadProgress(0);
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

  const getCategoryBadge = (category: string) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category);
    return cat || DOCUMENT_CATEGORIES[4]; // default to "other"
  };

  // Handle errors - show error state instead of early return
  const hasTableError = error && error.message && error.message.includes('project_documents');

  // Filter documents based on search and category
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: any) => {
      const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Render loading state
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

  // Render error state
  if (hasTableError) {
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
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            multiple
            className="hidden"
          />
        </CardHeader>

        <CardContent>
          {/* Upload Progress Bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Search and Filter Bar */}
          {documents.length > 0 && (
            <div className="mb-4 space-y-3">
              {/* Search Input */}
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

              {/* Category Filter Badges */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All Categories
                </button>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      selectedCategory === cat.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Results count */}
              {filteredDocuments.length !== documents.length && (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredDocuments.length} of {documents.length} documents
                </p>
              )}
            </div>
          )}

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-2">Upload blueprints, permits, or other project files</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No documents match your search</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
                className="text-sm text-primary hover:underline mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  {/* Left side - File icon, metadata, and category badge */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate text-sm">{doc.fileName}</p>
                        <Badge className={`flex-shrink-0 ${getCategoryBadge(doc.category).color}`}>
                          {getCategoryBadge(doc.category).label}
                        </Badge>
                      </div>
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
