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
      // Create a temporary container with the report HTML
      const container = document.createElement('div');
      container.innerHTML = previewHtml;

      // FIX 1: Convert oklch() colors to rgb() fallbacks
      // Remove any stylesheets or inline styles that use oklch()
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          const cssText = htmlEl.style.cssText;
          if (cssText && cssText.includes('oklch')) {
            // Replace oklch colors with safe fallbacks
            htmlEl.style.cssText = cssText.replace(
              /oklch\([^)]*\)/g,
              'rgb(0, 0, 0)'
            );
          }
        }
      });

      // Also fix <style> tags that may contain oklch
      const styleTags = container.querySelectorAll('style');
      styleTags.forEach((styleTag) => {
        if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
          styleTag.textContent = styleTag.textContent.replace(
            /oklch\([^)]*\)/g,
            'rgb(0, 0, 0)'
          );
        }
      });

      // FIX 2: Remove Google Maps AdvancedMarkerElements that crash html2canvas
      const markers = container.querySelectorAll('gmp-advanced-marker');
      markers.forEach((marker) => marker.remove());

      const options = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `${projectName}-report.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          removeContainer: true,
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().from(container).set(options).save();
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('[PDF Generation Error]:', error);
      toast.error('Failed to generate PDF. Please try again.');
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

  const handleSelectAllMedia = () => {
    if (selectedMediaIndices.length === media.length) {
      setSelectedMediaIndices([]);
    } else {
      setSelectedMediaIndices(media.map((_, i) => i));
    }
  };

  const toggleMediaSelection = (index: number) => {
    setSelectedMediaIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleClose = () => {
    setShowPreview(false);
    setPreviewHtml(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {!showPreview ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Generate Report
              </DialogTitle>
              <DialogDescription>
                Customize your report and generate a PDF for {projectName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Report Options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Report Options</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-map" className="flex items-center gap-2 cursor-pointer">
                      <Map className="w-4 h-4" />
                      Include Map
                    </Label>
                    <Switch
                      id="include-map"
                      checked={reportOptions.includeMap}
                      onCheckedChange={(checked) =>
                        setReportOptions(prev => ({ ...prev, includeMap: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-media" className="flex items-center gap-2 cursor-pointer">
                      <Image className="w-4 h-4" />
                      Include Media
                    </Label>
                    <Switch
                      id="include-media"
                      checked={reportOptions.includeMedia}
                      onCheckedChange={(checked) =>
                        setReportOptions(prev => ({ ...prev, includeMedia: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-stats" className="flex items-center gap-2 cursor-pointer">
                      <FileImage className="w-4 h-4" />
                      Include Statistics
                    </Label>
                    <Switch
                      id="include-stats"
                      checked={reportOptions.includeStats}
                      onCheckedChange={(checked) =>
                        setReportOptions(prev => ({ ...prev, includeStats: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Map Zoom */}
              {reportOptions.includeMap && (
                <div className="space-y-2">
                  <Label>Map Zoom Level: {reportOptions.mapZoom}</Label>
                  <Slider
                    value={[reportOptions.mapZoom]}
                    onValueChange={([value]) =>
                      setReportOptions(prev => ({ ...prev, mapZoom: value }))
                    }
                    min={5}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {/* Image Quality */}
              {reportOptions.includeMedia && (
                <div className="space-y-2">
                  <Label htmlFor="quality">Image Quality</Label>
                  <Select
                    value={reportOptions.imageQuality}
                    onValueChange={(value: any) =>
                      setReportOptions(prev => ({ ...prev, imageQuality: value }))
                    }
                  >
                    <SelectTrigger id="quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Smaller file size)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Media Selection */}
              {reportOptions.includeMedia && media.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Select Media to Include</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllMedia}
                    >
                      {selectedMediaIndices.length === media.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {media.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleMediaSelection(index)}
                      >
                        <Checkbox
                          checked={selectedMediaIndices.includes(index)}
                          onCheckedChange={() => toggleMediaSelection(index)}
                        />
                        <span className="text-sm truncate">{item.filename}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-wrap gap-2 justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Preview Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                Report Preview
              </DialogTitle>
              <DialogDescription>
                Review your report before downloading
              </DialogDescription>
            </DialogHeader>

            <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
            </div>

            <DialogFooter className="flex-wrap gap-2 justify-between">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                ← Return to Report Options
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleEmailReport}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Email Report
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
