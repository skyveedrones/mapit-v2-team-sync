import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConversionResult {
  easting?: number;
  northing?: number;
  latitude?: number;
  longitude?: number;
  systemKey?: string;
  combinedScaleFactor?: number;
  success: boolean;
  error?: string;
}

interface BatchResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  results: Array<ConversionResult & { index: number; identifier?: string }>;
  errors: Array<{ row: number; error: string }>;
  warnings?: string[];
}

interface SurveyPointPayload {
  identifier?: string;
  easting: number;
  northing: number;
  latitude: number;
  longitude: number;
  systemKey?: string;
  combinedScaleFactor?: number;
}

interface ProjectSurveyToolsProps {
  projectId: number;
  disabled?: boolean;
  className?: string;
  onSurveyOverlayAdded?: (overlayId?: number, overlayData?: any) => void;
}

function toSurveyPoint(result: ConversionResult & { identifier?: string }): SurveyPointPayload | null {
  if (!result.success || result.latitude == null || result.longitude == null || result.easting == null || result.northing == null) {
    return null;
  }

  return {
    identifier: result.identifier,
    easting: result.easting,
    northing: result.northing,
    latitude: result.latitude,
    longitude: result.longitude,
    systemKey: result.systemKey,
    combinedScaleFactor: result.combinedScaleFactor,
  };
}

export function ProjectSurveyTools({ projectId, disabled = false, className = "", onSurveyOverlayAdded }: ProjectSurveyToolsProps) {
  const [activeTab, setActiveTab] = useState("single");

  const [singleEasting, setSingleEasting] = useState("");
  const [singleNorthing, setSingleNorthing] = useState("");
  const [singleCRS, setSingleCRS] = useState("TX_NORTH_CENTRAL");
  const [singleCSF, setSingleCSF] = useState("1.0");
  const [singleIdentifier, setSingleIdentifier] = useState("Forney-1");
  const [singleResult, setSingleResult] = useState<ConversionResult | null>(null);

  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchCRS, setBatchCRS] = useState("TX_NORTH_CENTRAL");
  const [batchCSF, setBatchCSF] = useState("1.0");
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const convertSingleMutation = trpc.coordinateConverter.convertSingle.useMutation();
  const parseAndConvertMutation = trpc.coordinateConverterUpload.parseAndConvert.useMutation();
  const saveSurveyMarksMutation = trpc.project.saveSurveyMarks.useMutation();
  const availableSystemsQuery = trpc.coordinateConverter.getAvailableSystems.useQuery();

  const successfulBatchPoints = useMemo(() => {
    return (batchResult?.results ?? [])
      .map(toSurveyPoint)
      .filter((point): point is SurveyPointPayload => point != null);
  }, [batchResult]);

  const handleFile = useCallback((file: File) => {
    if (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setBatchFile(file);
      toast.success(`File selected: ${file.name}`);
      return;
    }
    toast.error("Please upload a CSV or Excel file");
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) handleFile(file);
  };

  const handleSingleConvert = async () => {
    if (!singleEasting || !singleNorthing) {
      toast.error("Please enter both easting and northing values");
      return;
    }

    try {
      const result = await convertSingleMutation.mutateAsync({
        easting: parseFloat(singleEasting),
        northing: parseFloat(singleNorthing),
        systemKey: singleCRS as any,
        combinedScaleFactor: parseFloat(singleCSF),
      });

      setSingleResult(result);
      if (result.success) toast.success("Coordinate converted");
      else toast.error(result.error || "Conversion failed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Conversion failed");
    }
  };

  const handleSaveSingle = async () => {
    if (!singleResult) return;
    const point = toSurveyPoint({ ...singleResult, identifier: singleIdentifier || undefined });
    if (!point) {
      toast.error("Convert a valid survey point before saving");
      return;
    }

    try {
      const result = await saveSurveyMarksMutation.mutateAsync({
        projectId,
        label: singleIdentifier ? `Forney Survey: ${singleIdentifier}` : "Forney Survey Mark",
        source: "forney-single",
        points: [point],
      });
      toast.success("Survey mark saved to project layers");
      onSurveyOverlayAdded?.(result.overlayId ?? undefined, result.overlay ?? undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save survey mark");
    }
  };

  const handleBatchConvert = async () => {
    if (!batchFile) {
      toast.error("Please select a file");
      return;
    }

    setBatchLoading(true);
    try {
      const buffer = await batchFile.arrayBuffer();
      const result = await parseAndConvertMutation.mutateAsync({
        fileName: batchFile.name,
        fileBuffer: new Uint8Array(buffer) as any,
        systemKey: batchCRS as any,
        combinedScaleFactor: parseFloat(batchCSF),
      });

      setBatchResult(result as BatchResult);
      if (result.failedRows === 0) {
        toast.success(`Successfully converted ${result.successfulRows} coordinates`);
      } else {
        toast.warning(`Converted ${result.successfulRows} coordinates. ${result.failedRows} rows had errors.`);
      }
      (result.warnings ?? []).forEach((warning: string) => toast.info(warning));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch conversion failed");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSaveBatch = async () => {
    if (successfulBatchPoints.length === 0) {
      toast.error("No converted survey points are available to save");
      return;
    }

    try {
      const result = await saveSurveyMarksMutation.mutateAsync({
        projectId,
        label: `Forney Survey Points (${successfulBatchPoints.length})`,
        source: batchFile?.name || "forney-batch",
        points: successfulBatchPoints,
      });
      toast.success(`${successfulBatchPoints.length} survey points saved to project layers`);
      onSurveyOverlayAdded?.(result.overlayId ?? undefined, result.overlay ?? undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save survey points");
    }
  };

  return (
    <Card className={`bg-slate-950/95 border-slate-800 text-slate-100 ${className}`}>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Project Survey Tools</p>
          <h3 className="text-base font-semibold text-white mt-1">Forney Coordinate Converter</h3>
          <p className="text-xs text-slate-400 mt-1">
            Convert SPCS survey marks and publish them to this project&apos;s shared map layers.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900">
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="batch">Batch</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label htmlFor="survey-single-id" className="text-xs text-slate-300">Point ID</Label>
              <Input id="survey-single-id" value={singleIdentifier} onChange={(e) => setSingleIdentifier(e.target.value)} placeholder="Forney-1" className="bg-slate-900 border-slate-700" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="survey-single-crs" className="text-xs text-slate-300">Coordinate System</Label>
              <Select value={singleCRS} onValueChange={setSingleCRS}>
                <SelectTrigger id="survey-single-crs" className="bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSystemsQuery.data?.map((system) => (
                    <SelectItem key={system.key} value={system.key}>{system.name} (EPSG:{system.epsg})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="survey-easting" className="text-xs text-slate-300">Easting (ft)</Label>
                <Input id="survey-easting" type="number" value={singleEasting} onChange={(e) => setSingleEasting(e.target.value)} placeholder="2000000" className="bg-slate-900 border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survey-northing" className="text-xs text-slate-300">Northing (ft)</Label>
                <Input id="survey-northing" type="number" value={singleNorthing} onChange={(e) => setSingleNorthing(e.target.value)} placeholder="500000" className="bg-slate-900 border-slate-700" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="survey-single-csf" className="text-xs text-slate-300">Combined Scale Factor</Label>
              <Input id="survey-single-csf" type="number" step="0.00001" value={singleCSF} onChange={(e) => setSingleCSF(e.target.value)} className="bg-slate-900 border-slate-700" />
            </div>

            <Button onClick={handleSingleConvert} disabled={disabled || convertSingleMutation.isPending} className="w-full">
              {convertSingleMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
              Convert Mark
            </Button>

            {singleResult && (
              <div className={`rounded-lg border p-3 text-xs ${singleResult.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                <div className="flex items-center gap-2 font-medium mb-1">
                  {singleResult.success ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
                  {singleResult.success ? "Conversion Result" : "Conversion Failed"}
                </div>
                {singleResult.success ? (
                  <div className="space-y-1 text-slate-300">
                    <div>Lat: {singleResult.latitude?.toFixed(8)}</div>
                    <div>Lng: {singleResult.longitude?.toFixed(8)}</div>
                  </div>
                ) : <p className="text-red-300">{singleResult.error}</p>}
              </div>
            )}

            <Button variant="outline" onClick={handleSaveSingle} disabled={disabled || !singleResult?.success || saveSurveyMarksMutation.isPending} className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
              {saveSurveyMarksMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Save to Project Layers
            </Button>
          </TabsContent>

          <TabsContent value="batch" className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label htmlFor="survey-batch-crs" className="text-xs text-slate-300">Coordinate System</Label>
              <Select value={batchCRS} onValueChange={setBatchCRS}>
                <SelectTrigger id="survey-batch-crs" className="bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSystemsQuery.data?.map((system) => (
                    <SelectItem key={system.key} value={system.key}>{system.name} (EPSG:{system.epsg})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="survey-batch-csf" className="text-xs text-slate-300">Combined Scale Factor</Label>
              <Input id="survey-batch-csf" type="number" step="0.00001" value={batchCSF} onChange={(e) => setBatchCSF(e.target.value)} className="bg-slate-900 border-slate-700" />
            </div>

            <div onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()} className="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center hover:border-emerald-500/60 transition-colors">
              <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
              <p className="text-xs text-slate-300 mb-2">Drop CSV/XLSX survey points here</p>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="bg-slate-900 border-slate-700 text-xs" />
              {batchFile && <p className="text-xs text-emerald-400 mt-2">Selected: {batchFile.name}</p>}
            </div>

            <Button onClick={handleBatchConvert} disabled={disabled || !batchFile || batchLoading} className="w-full">
              {batchLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
              Convert Batch
            </Button>

            {batchResult && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-slate-400">Rows</div><div className="font-semibold">{batchResult.totalRows}</div></div>
                  <div><div className="text-slate-400">Converted</div><div className="font-semibold text-emerald-400">{batchResult.successfulRows}</div></div>
                  <div><div className="text-slate-400">Errors</div><div className="font-semibold text-red-400">{batchResult.failedRows}</div></div>
                </div>
                {successfulBatchPoints.slice(0, 4).map((point, index) => (
                  <div key={`${point.identifier ?? index}-${point.latitude}`} className="flex justify-between gap-2 text-slate-300 border-t border-slate-800 pt-2">
                    <span className="truncate">{point.identifier || `Point ${index + 1}`}</span>
                    <span className="font-mono">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span>
                  </div>
                ))}
                {successfulBatchPoints.length > 4 && <p className="text-slate-500">+ {successfulBatchPoints.length - 4} more points</p>}
              </div>
            )}

            <Button variant="outline" onClick={handleSaveBatch} disabled={disabled || successfulBatchPoints.length === 0 || saveSurveyMarksMutation.isPending} className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
              {saveSurveyMarksMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Save Batch to Project Layers
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

export default ProjectSurveyTools;
