/**
 * Coordinate Converter Page
 * State Plane Coordinate (SPCS) to GPS (WGS84) conversion tool
 * Supports single conversions, batch file uploads, and map preview
 */

import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Upload, MapPin, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { CoordinateConverterMapPreview } from '@/components/CoordinateConverterMapPreview';

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
}

export default function CoordinateConverter() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('single');

  // Single conversion state
  const [singleEasting, setSingleEasting] = useState('');
  const [singleNorthing, setSingleNorthing] = useState('');
  const [singleCRS, setSingleCRS] = useState('TX_NORTH_CENTRAL');
  const [singleCSF, setSingleCSF] = useState('1.0');
  const [singleResult, setSingleResult] = useState<ConversionResult | null>(null);

  // Batch conversion state
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchCRS, setBatchCRS] = useState('TX_NORTH_CENTRAL');
  const [batchCSF, setBatchCSF] = useState('1.0');
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);

  // tRPC mutations
  const convertSingleMutation = trpc.coordinateConverter.convertSingle.useMutation();
  const parseAndConvertMutation = trpc.coordinateConverterUpload.parseAndConvert.useMutation();
  const availableSystemsQuery = trpc.coordinateConverter.getAvailableSystems.useQuery();

  // Handle single coordinate conversion
  const handleSingleConvert = async () => {
    if (!singleEasting || !singleNorthing) {
      toast.error('Please enter both easting and northing values');
      return;
    }

    try {
      const result = await convertSingleMutation.mutateAsync({
        easting: parseFloat(singleEasting),
        northing: parseFloat(singleNorthing),
        systemKey: singleCRS as any,
        combinedScaleFactor: parseFloat(singleCSF),
      });

      if (result.success) {
        setSingleResult(result);
        toast.success('Conversion successful!');
      } else {
        toast.error(result.error || 'Conversion failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Conversion failed');
    }
  };

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setBatchFile(file);
        toast.success(`File selected: ${file.name}`);
      } else {
        toast.error('Please upload a CSV or Excel file');
      }
    }
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setBatchFile(file);
        toast.success(`File selected: ${file.name}`);
      } else {
        toast.error('Please upload a CSV or Excel file');
      }
    }
  };

  // Handle batch conversion
  const handleBatchConvert = async () => {
    if (!batchFile) {
      toast.error('Please select a file');
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

      setBatchResult(result);

      if (result.failedRows === 0) {
        toast.success(`Successfully converted ${result.successfulRows} coordinates!`);
      } else {
        toast.warning(
          `Converted ${result.successfulRows} coordinates. ${result.failedRows} rows had errors.`
        );
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          toast.info(warning);
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch conversion failed');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Coordinate Converter</h1>
              <p className="text-sm text-muted-foreground">
                Convert State Plane Coordinates (SPCS) to GPS (WGS84)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="single">Single Coordinate</TabsTrigger>
            <TabsTrigger value="batch">Batch Upload</TabsTrigger>
          </TabsList>

          {/* Single Coordinate Tab */}
          <TabsContent value="single" className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                {/* CRS Selection */}
                <div>
                  <Label htmlFor="single-crs" className="text-base font-semibold">
                    Coordinate System
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the State Plane Coordinate System zone
                  </p>
                  <Select value={singleCRS} onValueChange={setSingleCRS}>
                    <SelectTrigger id="single-crs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSystemsQuery.data?.map((system) => (
                        <SelectItem key={system.key} value={system.key}>
                          {system.name} (EPSG:{system.epsg})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Coordinates Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="easting" className="text-base font-semibold">
                      Easting (feet)
                    </Label>
                    <Input
                      id="easting"
                      type="number"
                      placeholder="e.g., 2000000"
                      value={singleEasting}
                      onChange={(e) => setSingleEasting(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="northing" className="text-base font-semibold">
                      Northing (feet)
                    </Label>
                    <Input
                      id="northing"
                      type="number"
                      placeholder="e.g., 500000"
                      value={singleNorthing}
                      onChange={(e) => setSingleNorthing(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* CSF Input */}
                <div>
                  <Label htmlFor="single-csf" className="text-base font-semibold">
                    Combined Scale Factor (CSF)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Typically between 0.99 and 1.01. Use 1.0 if unknown.
                  </p>
                  <Input
                    id="single-csf"
                    type="number"
                    step="0.00001"
                    placeholder="1.0"
                    value={singleCSF}
                    onChange={(e) => setSingleCSF(e.target.value)}
                  />
                </div>

                {/* Convert Button */}
                <Button
                  onClick={handleSingleConvert}
                  disabled={convertSingleMutation.isPending}
                  size="lg"
                  className="w-full"
                >
                  {convertSingleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Convert Coordinate
                    </>
                  )}
                </Button>

                {/* Result Display */}
                {singleResult && (
                  <Card className="p-4 bg-accent/10 border-accent">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-3">Conversion Result</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Latitude</p>
                            <p className="font-mono font-semibold">{singleResult.latitude?.toFixed(8) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Longitude</p>
                            <p className="font-mono font-semibold">{singleResult.longitude?.toFixed(8) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Batch Upload Tab */}
          <TabsContent value="batch" className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                {/* CRS Selection */}
                <div>
                  <Label htmlFor="batch-crs" className="text-base font-semibold">
                    Coordinate System
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the State Plane Coordinate System zone
                  </p>
                  <Select value={batchCRS} onValueChange={setBatchCRS}>
                    <SelectTrigger id="batch-crs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSystemsQuery.data?.map((system) => (
                        <SelectItem key={system.key} value={system.key}>
                          {system.name} (EPSG:{system.epsg})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CSF Input */}
                <div>
                  <Label htmlFor="batch-csf" className="text-base font-semibold">
                    Combined Scale Factor (CSF)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Typically between 0.99 and 1.01. Use 1.0 if unknown.
                  </p>
                  <Input
                    id="batch-csf"
                    type="number"
                    step="0.00001"
                    placeholder="1.0"
                    value={batchCSF}
                    onChange={(e) => setBatchCSF(e.target.value)}
                  />
                </div>

                {/* File Drop Zone */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer bg-card/50"
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-semibold mb-1">Drop your file here</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to select a CSV or Excel file
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input">
                    <Button variant="outline" asChild>
                      <span>Select File</span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-4">
                    Maximum 1,000 rows and 5MB file size
                  </p>
                </div>

                {/* Selected File Display */}
                {batchFile && (
                  <div className="p-3 bg-accent/10 border border-accent rounded-lg">
                    <p className="text-sm font-semibold">{batchFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(batchFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                {/* Convert Button */}
                <Button
                  onClick={handleBatchConvert}
                  disabled={!batchFile || batchLoading}
                  size="lg"
                  className="w-full"
                >
                  {batchLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Convert Batch
                    </>
                  )}
                </Button>

                {/* Batch Result Display */}
                {batchResult && (
                  <div className="space-y-4">
                    <Card className="p-4 bg-accent/10 border-accent">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">Batch Conversion Complete</h3>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total Rows</p>
                              <p className="font-semibold">{batchResult.totalRows}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Successful</p>
                              <p className="font-semibold text-green-600">{batchResult.successfulRows}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Failed</p>
                              <p className="font-semibold text-red-600">{batchResult.failedRows}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Errors Display */}
                    {batchResult.errors.length > 0 && (
                      <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-red-600 mb-2">Errors</h3>
                            <div className="space-y-1 text-sm">
                              {batchResult.errors.slice(0, 5).map((error, idx) => (
                                <p key={idx} className="text-red-600">
                                  Row {error.row}: {error.error}
                                </p>
                              ))}
                              {batchResult.errors.length > 5 && (
                                <p className="text-red-600">
                                  ... and {batchResult.errors.length - 5} more errors
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Map Preview Toggle */}
                    {batchResult.successfulRows > 0 && (
                      <Button
                        onClick={() => setShowMapPreview(!showMapPreview)}
                        variant="outline"
                        className="w-full"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {showMapPreview ? 'Hide' : 'Show'} Map Preview
                      </Button>
                    )}

                    {/* Map Preview */}
                    {batchResult.successfulRows > 0 && showMapPreview && (
                      <CoordinateConverterMapPreview
                        points={batchResult.results.map((r) => ({
                          latitude: r.latitude || 0,
                          longitude: r.longitude || 0,
                          identifier: r.identifier,
                          index: batchResult.results.indexOf(r),
                          easting: r.easting,
                          northing: r.northing,
                        }))}
                      />
                    )}

                    {/* Sample Results */}
                    {batchResult.successfulRows > 0 && (
                      <Card className="p-4">
                        <h3 className="font-semibold mb-3">Sample Results (First 5)</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-2">Point ID</th>
                                <th className="text-left py-2 px-2">Latitude</th>
                                <th className="text-left py-2 px-2">Longitude</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batchResult.results.slice(0, 5).map((result, idx) => (
                                <tr key={idx} className="border-b border-border hover:bg-accent/5">
                                  <td className="py-2 px-2 font-mono text-xs">
                                    {result.identifier || `Point ${idx + 1}`}
                                  </td>
                                  <td className="py-2 px-2 font-mono text-xs">
                                    {result.latitude?.toFixed(8) || 'N/A'}
                                  </td>
                                  <td className="py-2 px-2 font-mono text-xs">
                                    {result.longitude?.toFixed(8) || 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {batchResult.successfulRows > 5 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            ... and {batchResult.successfulRows - 5} more results
                          </p>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <Card className="mt-8 p-6 bg-card/50 border-border">
          <h2 className="text-lg font-semibold mb-4">About Coordinate Conversion</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>State Plane Coordinates (SPCS):</strong> A coordinate system used in the United States for
              local surveying and mapping. Each state has multiple zones.
            </p>
            <p>
              <strong>US Survey Feet:</strong> The unit of measurement used in SPCS. One US survey foot equals
              approximately 0.3048006 meters.
            </p>
            <p>
              <strong>Combined Scale Factor (CSF):</strong> An adjustment factor that accounts for the difference
              between grid coordinates and ground coordinates. Typically between 0.99 and 1.01.
            </p>
            <p>
              <strong>Supported Zones:</strong> Texas North Central (EPSG:2276), Texas South Central (EPSG:2277),
              and Texas North (EPSG:2927).
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
