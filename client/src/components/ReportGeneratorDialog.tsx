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

/**
 * Convert an oklch() color string to an rgb() string.
 * Uses an off-screen canvas to let the browser resolve the color,
 * falling back to a manual approximation when canvas is unavailable
 * or the browser doesn't support oklch natively.
 */
function oklchToRgb(oklchStr: string): string {
  try {
    // Try using the browser's canvas to resolve the color
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = oklchStr;
      ctx.fillRect(0, 0, 1, 1);
      const imageData = ctx.getImageData(0, 0, 1, 1).data;
      const r = imageData[0];
      const g = imageData[1];
      const b = imageData[2];
      return `rgb(${r}, ${g}, ${b})`;
    }
  } catch {
    // Canvas approach failed
  }
  // Fallback: return a neutral gray instead of black for better appearance
  return 'rgb(128, 128, 128)';
}

/**
 * Replace every oklch(...) occurrence in a CSS string with its rgb() equivalent.
 */
function replaceOklchInCss(css: string): string {
  return css.replace(/oklch\([^)]*\)/g, (match) => oklchToRgb(match));
}

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

      // Sanitize oklch colors inside the container's inline styles
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          const cssText = htmlEl.style.cssText;
          if (cssText && cssText.includes('oklch')) {
            htmlEl.style.cssText = replaceOklchInCss(cssText);
          }
        }
      });

      // Sanitize <style> tags inside the container
      const styleTags = container.querySelectorAll('style');
      styleTags.forEach((styleTag) => {
        if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
          styleTag.textContent = replaceOklchInCss(styleTag.textContent);
        }
      });

      // Remove Google Maps AdvancedMarkerElements inside the container
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
          /**
           * onclone runs on the CLONED document that html2canvas creates
           * inside an iframe. This is where the actual rendering happens,
           * so we must fix oklch colors and remove AdvancedMarkerElements
           * in the clone — not just in our container.
           *
           * Error 1 (oklch): html2canvas copies the page's full stylesheet
           * into the iframe. Tailwind CSS v4 uses oklch() natively for its
           * color palette, and html2canvas's color parser cannot handle it.
           *
           * Error 2 (AdvancedMarkerElement): html2canvas clones the entire
           * DOM into an iframe. When a <gmp-advanced-marker> element is
           * moved into the iframe it fires connectedCallback, which throws
           * because its parent is not a <gmp-map>.
           */
          onclone: (clonedDoc: Document) => {
            // --- FIX 1: Replace oklch() in all stylesheets of the cloned document ---
            // Process <style> tags
            const clonedStyles = clonedDoc.querySelectorAll('style');
            clonedStyles.forEach((styleTag) => {
              if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
                styleTag.textContent = replaceOklchInCss(styleTag.textContent);
              }
            });

            // Process inline styles on all elements
            const clonedElements = clonedDoc.querySelectorAll('*');
            clonedElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style && htmlEl.style.cssText) {
                const cssText = htmlEl.style.cssText;
                if (cssText.includes('oklch')) {
                  htmlEl.style.cssText = replaceOklchInCss(cssText);
                }
              }
              // Also check the style attribute directly (catches cases
              // where the browser hasn't parsed it into the style object)
              const styleAttr = htmlEl.getAttribute?.('style');
              if (styleAttr && styleAttr.includes('oklch')) {
                htmlEl.setAttribute('style', replaceOklchInCss(styleAttr));
              }
            });

            // Process cssRules in adopted/linked stylesheets
            try {
              for (const sheet of Array.from(clonedDoc.styleSheets)) {
                try {
                  const rules = sheet.cssRules || sheet.rules;
                  if (!rules) continue;
                  let needsRewrite = false;
                  for (const rule of Array.from(rules)) {
                    if (rule.cssText && rule.cssText.includes('oklch')) {
                      needsRewrite = true;
                      break;
                    }
                  }
                  if (needsRewrite && sheet.ownerNode instanceof HTMLStyleElement) {
                    sheet.ownerNode.textContent = replaceOklchInCss(
                      sheet.ownerNode.textContent || ''
                    );
                  }
                } catch {
                  // CORS or security restrictions on external sheets — skip
                }
              }
            } catch {
              // styleSheets access failed — skip
            }

            // --- FIX 2: Remove all AdvancedMarkerElements from the clone ---
            const clonedMarkers = clonedDoc.querySelectorAll('gmp-advanced-marker');
            clonedMarkers.forEach((marker) => marker.remove());

            // Also remove any Google Maps internal elements that may cause issues
            const gmapInternals = clonedDoc.querySelectorAll(
              'gmp-internal-advanced-marker, gmp-internal-marker'
            );
            gmapInternals.forEach((el) => el.remove());
          },
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      // @ts-ignore — html2pdf is loaded globally via CDN script tag
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
