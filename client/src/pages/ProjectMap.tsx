/**
 * Project Map Page
 * Displays media locations on an interactive Google Map with flight path visualization
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Camera,
  Layers,
  MapPin,
  Route,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { Link, useParams } from "wouter";

// Geotagged media item with required GPS coordinates
interface GeotaggedMedia {
  id: number;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  mediaType: "photo" | "video";
  latitude: number;
  longitude: number;
  altitude: number | null;
  capturedAt: Date | null;
}

export default function ProjectMap() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [showFlightPath, setShowFlightPath] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<GeotaggedMedia | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "terrain" | "hybrid">("satellite");
  const [mapReady, setMapReady] = useState(false);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  // Fetch media for this project
  const { data: mediaItems, isLoading: mediaLoading } = trpc.media.list.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Filter media with GPS coordinates and convert decimal strings to numbers
  const geotaggedMedia: GeotaggedMedia[] = (mediaItems || [])
    .filter(m => m.latitude !== null && m.longitude !== null)
    .map(m => ({
      id: m.id,
      filename: m.filename,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
      mediaType: m.mediaType,
      latitude: parseFloat(String(m.latitude)),
      longitude: parseFloat(String(m.longitude)),
      altitude: m.altitude ? parseFloat(String(m.altitude)) : null,
      capturedAt: m.capturedAt,
    }));

  // Calculate center from media locations
  const getMapCenter = useCallback(() => {
    if (geotaggedMedia.length === 0) {
      // Default to Forney, TX if no geotagged media
      return { lat: 32.7479, lng: -96.4719 };
    }
    const avgLat = geotaggedMedia.reduce((sum, m) => sum + m.latitude, 0) / geotaggedMedia.length;
    const avgLng = geotaggedMedia.reduce((sum, m) => sum + m.longitude, 0) / geotaggedMedia.length;
    return { lat: avgLat, lng: avgLng };
  }, [geotaggedMedia]);

  // Create custom marker element
  const createMarkerElement = (media: GeotaggedMedia, index: number) => {
    const div = document.createElement("div");
    div.className = "relative cursor-pointer transform hover:scale-110 transition-transform";
    
    // Create marker pin
    const pin = document.createElement("div");
    pin.className = `w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
      media.mediaType === "video" ? "bg-red-500" : "bg-emerald-500"
    }`;
    pin.innerHTML = media.mediaType === "video" 
      ? '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>';
    
    // Add number badge
    const badge = document.createElement("div");
    badge.className = "absolute -top-1 -right-1 w-4 h-4 bg-background text-foreground text-xs rounded-full flex items-center justify-center font-bold border border-border";
    badge.textContent = String(index + 1);
    
    div.appendChild(pin);
    div.appendChild(badge);
    
    return div;
  };

  // Add markers and flight path when map is ready and data is loaded
  useEffect(() => {
    if (!mapReady || !mapRef.current || geotaggedMedia.length === 0) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Create info window if not exists
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Add markers for each geotagged media
    geotaggedMedia.forEach((media, index) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: media.latitude, lng: media.longitude },
        content: createMarkerElement(media, index),
        title: media.filename,
      });

      // Add click listener
      marker.addListener("click", () => {
        setSelectedMedia(media);
        
        // Create info window content
        const content = document.createElement("div");
        content.className = "p-2 max-w-xs";
        content.innerHTML = `
          <div class="font-semibold text-sm mb-1">${media.filename}</div>
          ${media.thumbnailUrl ? `<img src="${media.thumbnailUrl}" alt="${media.filename}" class="w-full h-32 object-cover rounded mb-2" />` : ''}
          <div class="text-xs text-gray-600">
            <div>📍 ${media.latitude.toFixed(6)}, ${media.longitude.toFixed(6)}</div>
            ${media.altitude ? `<div>🏔️ Altitude: ${media.altitude.toFixed(1)}m</div>` : ''}
            ${media.capturedAt ? `<div>📅 ${new Date(media.capturedAt).toLocaleString()}</div>` : ''}
          </div>
        `;

        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw flight path polyline
    if (geotaggedMedia.length > 1 && showFlightPath) {
      // Sort by capture time if available, otherwise by ID
      const sortedMedia = [...geotaggedMedia].sort((a, b) => {
        if (a.capturedAt && b.capturedAt) {
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        }
        return a.id - b.id;
      });

      const pathCoordinates = sortedMedia.map(m => ({
        lat: m.latitude,
        lng: m.longitude,
      }));

      polylineRef.current = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      });
    }

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    geotaggedMedia.forEach(m => {
      bounds.extend({ lat: m.latitude, lng: m.longitude });
    });
    map.fitBounds(bounds, 50);

  }, [mapReady, geotaggedMedia, showFlightPath]);

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setMapTypeId(mapType);
    setMapReady(true);
  }, [mapType]);

  // Toggle flight path
  const toggleFlightPath = () => {
    const newValue = !showFlightPath;
    setShowFlightPath(newValue);
    if (polylineRef.current) {
      polylineRef.current.setMap(newValue ? mapRef.current : null);
    }
  };

  // Change map type
  const changeMapType = (type: "roadmap" | "satellite" | "terrain" | "hybrid") => {
    setMapType(type);
    if (mapRef.current) {
      mapRef.current.setMapTypeId(type);
    }
  };

  // Zoom controls
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 15) + 1);
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 15) - 1);
    }
  };

  // Center on selected media
  const centerOnMedia = (media: GeotaggedMedia) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: media.latitude, lng: media.longitude });
      mapRef.current.setZoom(18);
      setSelectedMedia(media);
    }
  };

  if (projectLoading || mediaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Project
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {project.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {geotaggedMedia.length} of {mediaItems?.length || 0} media items with GPS data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          {geotaggedMedia.length > 0 ? (
            <MapView
              className="w-full h-full"
              initialCenter={getMapCenter()}
              initialZoom={15}
              onMapReady={handleMapReady}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No GPS Data Available</h2>
                <p className="text-muted-foreground mb-4">
                  Upload drone photos with GPS metadata to see them on the map.
                </p>
                <Link href={`/project/${projectId}`}>
                  <Button>Upload Media</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Map Controls */}
          {geotaggedMedia.length > 0 && (
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {/* Zoom Controls */}
              <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none border-b border-border"
                  onClick={zoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none"
                  onClick={zoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Map Type Toggle */}
              <div className="bg-card rounded-lg shadow-lg border border-border p-2">
                <div className="flex flex-col gap-1">
                  <Button
                    variant={mapType === "satellite" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => changeMapType("satellite")}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Satellite
                  </Button>
                  <Button
                    variant={mapType === "hybrid" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => changeMapType("hybrid")}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Hybrid
                  </Button>
                  <Button
                    variant={mapType === "terrain" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => changeMapType("terrain")}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Terrain
                  </Button>
                  <Button
                    variant={mapType === "roadmap" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => changeMapType("roadmap")}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Road
                  </Button>
                </div>
              </div>

              {/* Flight Path Toggle */}
              <Button
                variant={showFlightPath ? "default" : "outline"}
                size="sm"
                className="shadow-lg"
                onClick={toggleFlightPath}
              >
                <Route className="h-4 w-4 mr-2" />
                Flight Path
              </Button>
            </div>
          )}

          {/* Legend */}
          {geotaggedMedia.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow-lg border border-border p-3">
              <h3 className="text-sm font-semibold mb-2">Legend</h3>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Camera className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span>Photo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <Video className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span>Video</span>
                </div>
                {showFlightPath && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-emerald-500" />
                    <span>Flight Path</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Media List */}
        {geotaggedMedia.length > 0 && (
          <div className="w-80 bg-card border-l border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Media Locations
              </h2>
              <p className="text-sm text-muted-foreground">
                Click to center on map
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {geotaggedMedia.map((media, index) => (
                <div
                  key={media.id}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedMedia?.id === media.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                  onClick={() => centerOnMedia(media)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      media.mediaType === "video" ? "bg-red-500" : "bg-emerald-500"
                    }`}>
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{media.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
                      </p>
                      {media.capturedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(media.capturedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {media.thumbnailUrl && (
                      <img
                        src={media.thumbnailUrl}
                        alt={media.filename}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Media Preview */}
      {selectedMedia && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card rounded-lg shadow-xl border border-border p-4 max-w-md z-50">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => setSelectedMedia(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex gap-4">
            {selectedMedia.thumbnailUrl ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.filename}
                className="w-32 h-24 object-cover rounded"
              />
            ) : (
              <div className="w-32 h-24 bg-muted rounded flex items-center justify-center">
                {selectedMedia.mediaType === "video" ? (
                  <Video className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{selectedMedia.filename}</h3>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>📍 {selectedMedia.latitude.toFixed(6)}, {selectedMedia.longitude.toFixed(6)}</p>
                {selectedMedia.altitude && <p>🏔️ Altitude: {selectedMedia.altitude.toFixed(1)}m</p>}
                {selectedMedia.capturedAt && (
                  <p>📅 {new Date(selectedMedia.capturedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
