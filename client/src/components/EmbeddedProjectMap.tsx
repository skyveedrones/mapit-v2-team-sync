/**
 * Embedded Project Map Component
 * Displays an always-visible map with GPS markers from project media
 */

import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import { Expand, MapPin, Navigation } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "wouter";

interface EmbeddedProjectMapProps {
  projectId: number;
  projectName: string;
}

export function EmbeddedProjectMap({ projectId, projectName }: EmbeddedProjectMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  const { data: mediaList, isLoading } = trpc.media.list.useQuery({ projectId });

  // Filter media with GPS coordinates
  const mediaWithGPS = mediaList?.filter(
    (m) => m.latitude && m.longitude
  ) || [];

  // Calculate center point from all GPS coordinates
  const getCenter = useCallback(() => {
    if (mediaWithGPS.length === 0) {
      return { lat: 32.7767, lng: -96.797 }; // Default to Dallas
    }
    const sumLat = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.latitude!), 0);
    const sumLng = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.longitude!), 0);
    return {
      lat: sumLat / mediaWithGPS.length,
      lng: sumLng / mediaWithGPS.length,
    };
  }, [mediaWithGPS]);

  // Handle map ready - add markers and flight path
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Clear existing markers
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    if (mediaWithGPS.length === 0) return;

    // Create info window
    infoWindowRef.current = new google.maps.InfoWindow();

    // Sort by capture time for flight path
    const sortedMedia = [...mediaWithGPS].sort((a, b) => {
      if (a.capturedAt && b.capturedAt) {
        return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
      }
      return 0;
    });

    // Create flight path polyline
    const pathCoordinates = sortedMedia.map((m) => ({
      lat: parseFloat(m.latitude!),
      lng: parseFloat(m.longitude!),
    }));

    polylineRef.current = new google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: "#10B981",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map,
    });

    // Create markers for each media item
    sortedMedia.forEach((media, index) => {
      const position = {
        lat: parseFloat(media.latitude!),
        lng: parseFloat(media.longitude!),
      };

      // Create custom marker element with number
      const markerElement = document.createElement("div");
      markerElement.className = "marker-container";
      markerElement.innerHTML = `
        <div style="
          background: #10B981;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">${index + 1}</div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: markerElement,
        title: media.filename,
      });

      // Add click listener for info window
      marker.addListener("click", () => {
        setSelectedMedia(media);
        const content = `
          <div style="max-width: 200px; padding: 8px;">
            <img 
              src="${media.url}" 
              alt="${media.filename}"
              style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;"
            />
            <p style="font-weight: 600; font-size: 12px; margin: 0 0 4px 0; color: #333;">${media.filename}</p>
            <p style="font-size: 11px; color: #666; margin: 0;">
              ${parseFloat(media.latitude!).toFixed(6)}°, ${parseFloat(media.longitude!).toFixed(6)}°
            </p>
          </div>
        `;
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (mediaWithGPS.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      mediaWithGPS.forEach((m) => {
        bounds.extend({
          lat: parseFloat(m.latitude!),
          lng: parseFloat(m.longitude!),
        });
      });
      map.fitBounds(bounds, 50);
    } else if (mediaWithGPS.length === 1) {
      map.setCenter({
        lat: parseFloat(mediaWithGPS[0].latitude!),
        lng: parseFloat(mediaWithGPS[0].longitude!),
      });
      map.setZoom(16);
    }
  }, [mediaWithGPS]);

  if (isLoading) {
    return (
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Project Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Project Map
            {mediaWithGPS.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({mediaWithGPS.length} location{mediaWithGPS.length !== 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
          {mediaWithGPS.length > 0 && (
            <Link href={`/project/${projectId}/map`}>
              <Button variant="outline" size="sm">
                <Expand className="h-4 w-4 mr-2" />
                Full Screen
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mediaWithGPS.length === 0 ? (
          <div className="w-full h-[300px] rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center text-muted-foreground">
            <Navigation className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No GPS Data Available</p>
            <p className="text-sm">Upload media with GPS coordinates to see them on the map</p>
          </div>
        ) : (
          <div className="relative">
            <MapView
              className="w-full h-[300px] rounded-lg overflow-hidden"
              initialCenter={getCenter()}
              initialZoom={14}
              onMapReady={handleMapReady}
            />
            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
              <span className="text-primary font-medium">{mediaWithGPS.length}</span> GPS points • 
              <span className="text-emerald-500 ml-1">—</span> Flight path
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
