/**
 * Coordinate Converter Map Preview Component
 * Displays converted coordinates on Google Maps with clustering
 * Supports export to project layers
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin, Download, Save, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    MarkerClusterer: any;
    SuperClusterAlgorithm: any;
  }
}

interface ConvertedPoint {
  latitude: number;
  longitude: number;
  identifier?: string;
  index: number;
  easting?: number;
  northing?: number;
}

interface CoordinateConverterMapPreviewProps {
  points: ConvertedPoint[];
  onExport?: (points: ConvertedPoint[]) => Promise<void>;
  isExporting?: boolean;
  projectId?: string;
}

export function CoordinateConverterMapPreview({
  points,
  onExport,
  isExporting = false,
  projectId,
}: CoordinateConverterMapPreviewProps) {
  const mapRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [markerClusterer, setMarkerClusterer] = useState<any>(null);
  const [bounds, setBounds] = useState<any>(null);

  // Initialize map
  const handleMapReady = (mapInstance: any) => {
    setMap(mapInstance);
  };

  // Initialize Google Map on component mount
  useEffect(() => {
    if (!mapRef.current || map) return;

    const initMap = () => {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 32.7157, lng: -96.7283 }, // Default to Texas
        mapTypeId: 'terrain',
      });
      setMap(mapInstance);
    };

    if (window.google) {
      initMap();
    }
  }, []);

  // Add markers to map
  useEffect(() => {
    if (!map || points.length === 0) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    // Create new markers
    const newMarkers = points.map((point, idx) => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: point.latitude,
          lng: point.longitude,
        },
        map: map,
        title: point.identifier || `Point ${idx + 1}`,
        label: {
          text: String(idx + 1),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold',
        },
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-size: 12px;">
            <strong>${point.identifier || `Point ${idx + 1}`}</strong><br/>
            Lat: ${point.latitude.toFixed(8)}<br/>
            Lon: ${point.longitude.toFixed(8)}<br/>
            ${point.easting ? `Easting: ${point.easting.toFixed(2)}<br/>` : ''}
            ${point.northing ? `Northing: ${point.northing.toFixed(2)}<br/>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        // Close all other info windows
        markers.forEach((m) => {
          if (m.infoWindow) {
            m.infoWindow.close();
          }
        });
        infoWindow.open(map, marker);
      });

      marker.infoWindow = infoWindow;
      return marker;
    });

    setMarkers(newMarkers);

    // Create marker clusterer
    if (newMarkers.length > 0) {
      // Remove old clusterer if exists
      if (markerClusterer) {
        markerClusterer.clearMarkers();
      }

      // Create new clusterer (if available)
      if (window.MarkerClusterer) {
        const clusterer = new window.MarkerClusterer({
          map,
          markers: newMarkers,
          algorithm: window.SuperClusterAlgorithm ? new window.SuperClusterAlgorithm({ maxZoom: 15 }) : undefined,
        });
        setMarkerClusterer(clusterer);
      }

      // Fit bounds to all markers
      const newBounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach((marker) => {
        newBounds.extend(marker.getPosition());
      });
      map.fitBounds(newBounds);
      setBounds(newBounds);
    }
  }, [map, points]);

  // Handle export
  const handleExport = async () => {
    if (!onExport) {
      toast.error('Export not available');
      return;
    }

    try {
      await onExport(points);
      toast.success('Points exported successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  // Handle download as GeoJSON
  const handleDownloadGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: points.map((point) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.identifier || `Point ${point.index + 1}`,
          index: point.index,
          easting: point.easting,
          northing: point.northing,
        },
      })),
    };

    const dataStr = JSON.stringify(geojson, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `converted-coordinates-${Date.now()}.geojson`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('GeoJSON downloaded!');
  };

  // Handle download as CSV
  const handleDownloadCSV = () => {
    const csv = [
      ['Point ID', 'Latitude', 'Longitude', 'Easting', 'Northing'].join(','),
      ...points.map((point) =>
        [
          point.identifier || `Point ${point.index + 1}`,
          point.latitude.toFixed(8),
          point.longitude.toFixed(8),
          point.easting?.toFixed(2) || '',
          point.northing?.toFixed(2) || '',
        ].join(',')
      ),
    ].join('\n');

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `converted-coordinates-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('CSV downloaded!');
  };

  if (points.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No points to display. Convert coordinates first.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <Card className="overflow-hidden">
        <div style={{ width: '100%', height: '400px' }} ref={mapRef} />
      </Card>

      {/* Stats */}
      <Card className="p-4 bg-accent/10 border-accent">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Points</p>
            <p className="font-semibold text-lg">{points.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Latitude</p>
            <p className="font-mono text-sm">
              {(points.reduce((sum, p) => sum + p.latitude, 0) / points.length).toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Longitude</p>
            <p className="font-mono text-sm">
              {(points.reduce((sum, p) => sum + p.longitude, 0) / points.length).toFixed(6)}
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          onClick={handleDownloadGeoJSON}
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          GeoJSON
        </Button>
        <Button
          onClick={handleDownloadCSV}
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
        {onExport && projectId && (
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save as Layer
              </>
            )}
          </Button>
        )}
      </div>

      {/* Points List */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Converted Points</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Point ID</th>
                <th className="text-left py-2 px-2">Latitude</th>
                <th className="text-left py-2 px-2">Longitude</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(0, 10).map((point) => (
                <tr key={point.index} className="border-b border-border hover:bg-accent/5">
                  <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{point.index + 1}</td>
                  <td className="py-2 px-2 font-mono text-xs">
                    {point.identifier || `Point ${point.index + 1}`}
                  </td>
                  <td className="py-2 px-2 font-mono text-xs">{point.latitude.toFixed(8)}</td>
                  <td className="py-2 px-2 font-mono text-xs">{point.longitude.toFixed(8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {points.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2">
            ... and {points.length - 10} more points
          </p>
        )}
      </Card>
    </div>
  );
}
