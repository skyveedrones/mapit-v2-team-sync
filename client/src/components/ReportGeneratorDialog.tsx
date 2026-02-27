/**
 * Report Generator Dialog
 * Allows users to generate PDF reports with project info, map, and selected media
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  Check,
  Download,
  Eye,
  FileImage,
  FileText,
  Image,
  Loader2,
  Map,
  MapPin,
  Route,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ReportGeneratorDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: Media[];
  isDemoProject?: boolean;
}

export function ReportGeneratorDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  media,
  isDemoProject,
}: ReportGeneratorDialogProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedMediaIndices, setSelectedMediaIndices] = useState<number[]>([]);
  const [reportOptions, setReportOptions] = useState({
    includeMap: true,
    includeMedia: true,
    includeStats: true,
    mapZoom: 15,
    imageQuality: 'high' as 'low' | 'medium' | 'high',
  });

  const generateReportMutation = trpc.report.generate.useMutation();

  const handleGeneratePreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      const selectedMedia = selectedMediaIndices.map(i => media[i]);
      const resolutionMap = { low: 'low', medium: 'medium', high: 'high' } as const;
      
      const result = await generateReportMutation.mutateAsync({
        projectId,
        mediaIds: selectedMedia.map(m => m.id),
        resolution: resolutionMap[reportOptions.imageQuality],
        mapStyle: 'hybrid',
        showFlightPath: true,
        includeWatermark: false,
      });

      setPreviewHtml(result.html);
      setShowPreview(true);
      toast.success('Report preview generated!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report preview');
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, selectedMediaIndices, reportOptions, media, generateReportMutation]);

  const handleDownloadPdf = async () => {
    if (!previewHtml) return;

    setIsDownloading(true);
    toast.info('Generating PDF, this may take a moment...');

    try {
      // Create a hidden iframe to render the report HTML in complete isolation
      // This prevents the page's oklch CSS variables from being inherited
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '850px';
      iframe.style.height = '1100px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      // Write the report HTML into the iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      iframeDoc.open();
      iframeDoc.write(previewHtml);
      iframeDoc.close();

      // Wait for images to load
      await new Promise<void>((resolve) => {
        const images = iframeDoc.querySelectorAll('img');
        let loaded = 0;
        const total = images.length;
        if (total === 0) {
          resolve();
          return;
        }
        const checkDone = () => {
          loaded++;
          if (loaded >= total) resolve();
        };
        images.forEach((img) => {
          if (img.complete) {
            checkDone();
          } else {
            img.addEventListener('load', checkDone);
            img.addEventListener('error', checkDone);
          }
        });
        // Safety timeout after 30 seconds
        setTimeout(resolve, 30000);
      });

      // Small delay to ensure rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const options = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `${projectName}-report.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      // Use the iframe's body as the source - it has NO oklch styles
      await (window as any).html2pdf().from(iframeDoc.body).set(options).save();

      // Clean up the iframe
      document.body.removeChild(iframe);

      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('[PDF Generation Error]:', error);
      toast.error('Failed to generate PDF. Please try again.');
      // Clean up any leftover iframes
      const leftover = document.querySelector('iframe[style*="-9999px"]');
      if (leftover) leftover.remove();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailReport = async () => {
    if (!previewHtml) return;

    try {
      const userEmail = 'user@example.com'; // Get from auth context in real implementation
      await trpc.report.emailReport.useMutation().mutateAsync({
        html: previewHtml,
        projectName,
        recipientEmail: userEmail,
      });
      toast.success('Report sent via email!');
      setShowPreview(false);
      setPreviewHtml(null);
    } catch (error) {
      console.error('Error emailing report:', error);
      toast.error('Failed to send report via email');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showPreview ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription>
                Create a customized PDF report for {projectName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Report Options */}
              <div className="space-y-4">
                <h3 className="font-semibold">Report Options</h3>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-map">Include Map</Label>
                  <Switch
                    id="include-map"
                    checked={reportOptions.includeMap}
                    onCheckedChange={(checked) =>
                      setReportOptions({ ...reportOptions, includeMap: checked })
                    }
                  />
                </div>

                {reportOptions.includeMap && (
                  <div className="space-y-2 pl-4 border-l-2 border-green-500">
                    <Label>Map Zoom Level: {reportOptions.mapZoom}</Label>
                    <Slider
                      value={[reportOptions.mapZoom]}
                      onValueChange={([value]) =>
                        setReportOptions({ ...reportOptions, mapZoom: value })
                      }
                      min={5}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-media">Include Media</Label>
                  <Switch
                    id="include-media"
                    checked={reportOptions.includeMedia}
                    onCheckedChange={(checked) =>
                      setReportOptions({ ...reportOptions, includeMedia: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-stats">Include Statistics</Label>
                  <Switch
                    id="include-stats"
                    checked={reportOptions.includeStats}
                    onCheckedChange={(checked) =>
                      setReportOptions({ ...reportOptions, includeStats: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-quality">Image Quality</Label>
                  <Select
                    value={reportOptions.imageQuality}
                    onValueChange={(value) =>
                      setReportOptions({
                        ...reportOptions,
                        imageQuality: value as 'low' | 'medium' | 'high',
                      })
                    }
                  >
                    <SelectTrigger id="image-quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Smaller file)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Media Selection */}
              {reportOptions.includeMedia && media.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Select Media to Include</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                    {media.map((m, idx) => (
                      <div key={m.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`media-${idx}`}
                          checked={selectedMediaIndices.includes(idx)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMediaIndices([...selectedMediaIndices, idx]);
                            } else {
                              setSelectedMediaIndices(
                                selectedMediaIndices.filter((i) => i !== idx)
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`media-${idx}`} className="cursor-pointer flex-1">
                          {m.filename}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-wrap gap-2 justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  variant="outline"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report Preview</DialogTitle>
              <DialogDescription>Review before downloading or emailing</DialogDescription>
            </DialogHeader>

            <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
            </div>

            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewHtml(null);
                }}
              >
                Back to Options
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleEmailReport}
                variant="secondary"
              >
                <FileText className="w-4 h-4 mr-2" />
                Email Report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
