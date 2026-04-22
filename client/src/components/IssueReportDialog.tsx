/**
 * IssueReportDialog
 * Generates a PDF report filtered to media tagged as 'corrective' or 'punchlist'.
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
import { trpc } from "@/lib/trpc";
import { Download, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface IssueReportDialogProps {
  projectId: number;
  projectName: string;
  issueReportType: "corrective" | "punchlist";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueReportDialog({
  projectId,
  projectName,
  issueReportType,
  open,
  onOpenChange,
}: IssueReportDialogProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);

  const generateMutation = trpc.report.generateIssueReport.useMutation();
  const downloadPdfMutation = trpc.report.downloadPdf.useMutation();
  const saveReportToDocuments = trpc.report.saveReportToDocuments.useMutation();

  const reportTitle =
    issueReportType === "corrective"
      ? "Corrective Actions Report"
      : "Punchlist Report";

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        projectId,
        issueReportType,
        resolution: "medium",
        mapStyle: "hybrid",
      });
      setPreviewHtml(result.html);
      setMediaCount(result.mediaCount);
      toast.success(`${reportTitle} generated with ${result.mediaCount} item(s)`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to generate report";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!previewHtml) return;
    const printStyles = `
      <style>
        @media print {
          body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: letter; margin: 0.4in; }
          img { max-width: 100% !important; page-break-inside: avoid; }
        }
      </style>
    `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(previewHtml.replace("</head>", `${printStyles}</head>`));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
    toast.info("Opening print dialog — select 'Save as PDF' as the destination.");

    // Background: generate a server-side PDF and save it to project documents
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportTitle.replace(/\s+/g, '_')}_${dateStr}.pdf`;
    downloadPdfMutation.mutateAsync({ html: previewHtml, projectName }).then(pdfResult => {
      return saveReportToDocuments.mutateAsync({
        projectId,
        pdfBase64: pdfResult.pdfData,
        fileName,
      });
    }).then(() => {
      toast.success('Report saved to project documents', { description: fileName, duration: 3000 });
    }).catch(() => { /* non-fatal */ });
  };

  const handleClose = () => {
    setPreviewHtml(null);
    setMediaCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>
            Generates a PDF report for <strong>{projectName}</strong> containing
            all media tagged as &ldquo;
            {issueReportType === "corrective" ? "Corrective Action" : "Punchlist"}
            &rdquo;.
          </DialogDescription>
        </DialogHeader>

        {previewHtml ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Report ready &mdash; {mediaCount} photo(s) included.
            </p>
            <div className="border rounded-md overflow-hidden h-48 bg-white">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full"
                title="Report Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            Click &ldquo;Generate&rdquo; to build the report. Only photos tagged
            with the matching issue type will be included.
          </p>
        )}

        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {!previewHtml ? (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating&hellip;
                </>
              ) : (
                "Generate"
              )}
            </Button>
          ) : (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              <Download className="h-4 w-4 mr-1" />
              Save as PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
