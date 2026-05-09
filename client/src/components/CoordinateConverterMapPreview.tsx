/**
 * Coordinate Converter Map Preview Component
 * Displays converted coordinates on Mapbox GL with native clustering
 * Supports export to project layers
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin, Download, Save, Loader2 } from 'lucide-react';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) {
        console.error('[CoordinateConverterMapPreview] VITE_MAPBOX_TOKEN is not set');
        return;
      }
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-96.7283, 32.7157], // Default to Texas
        zoom: 12,
      });

      map.current.on('load', () => {
        setIsMapReady(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        toast.error('Failed to load map');
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast.error('Failed to initialize map');
    }

    return () => {
      // Don't destroy map on unmount to preserve state
    };
  }, []);

  // Add points as GeoJSON source with clustering
  useEffect(() => {
    if (!map.current || !isMapReady || points.length === 0) return;

    const geojsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: points.map((point) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.identifier || `Point ${point.index + 1}`,
          index: point.index,
          easting: point.easting,
          northing: point.northing,
          latitude: point.latitude,
          longitude: point.longitude,
        },
      })),
    };

    // Remove existing source if present
    if (map.current.getSource('converted-points')) {
      map.current.removeSource('converted-points');
    }

    // Remove existing layers if present
    ['clusters', 'cluster-count', 'unclustered-point'].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });

    // Add source with clustering
    map.current.addSource('converted-points', {
      type: 'geojson',
      data: geojsonData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Add cluster layer
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'converted-points',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#10b981',
        'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#059669',
      },
    });

    // Add cluster count layer
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'converted-points',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Add unclustered point layer
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'converted-points',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#3b82f6',
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#1e40af',
        'circle-opacity': 0.8,
      },
    });

    // Add click handler for clusters
    map.current.on('click', 'clusters', (e) => {
      const features = map.current?.querySourceFeatures('converted-points', {
        sourceLayer: 'converted-points',
      });
      if (features && features.length > 0) {
        const clusterId = features[0].properties?.cluster_id;
        const zoom = map.current?.getZoom() || 12;
        if (clusterId !== undefined) {
          const source = map.current?.getSource('converted-points') as any;
          if (source?.getClusterExpansionZoom) {
            source.getClusterExpansionZoom(clusterId, (err: Error | null, expansionZoom: number) => {
              if (err) return;
              const geometry = features[0].geometry as GeoJSON.Point;
              map.current?.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: expansionZoom,
                duration: 500,
              });
            });
          }
        }
      }
    });

    // Add click handler for individual points
    map.current.on('click', 'unclustered-point', (e) => {
      const coordinates = (e.features?.[0]?.geometry as GeoJSON.Point)?.coordinates as [number, number];
      const props = e.features?.[0]?.properties;

      if (coordinates && props) {
        new mapboxgl.Popup({ offset: 25 })
          .setLngLat(coordinates)
          .setHTML(
            `
            <div style="padding: 8px; font-size: 12px;">
              <strong>${props.id}</strong><br/>
              Lat: ${props.latitude.toFixed(8)}<br/>
              Lon: ${props.longitude.toFixed(8)}<br/>
              ${props.easting ? `Easting: ${props.easting.toFixed(2)}<br/>` : ''}
              ${props.northing ? `Northing: ${props.northing.toFixed(2)}<br/>` : ''}
            </div>
          `
          )
          .addTo(map.current!);
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    // Fit bounds to all points
    if (points.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((point) => {
        bounds.extend([point.longitude, point.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, duration: 500 });
    }
  }, [points, isMapReady]);

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
        <div
          ref={mapContainer}
          style={{ width: '100%', height: '400px' }}
          className="mapbox-container"
        />
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
