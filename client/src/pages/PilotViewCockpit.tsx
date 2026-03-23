import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { MapboxFlyControls } from "@/components/MapboxFlyControls";
import { MediaDetailSidebar } from "@/components/MediaDetailSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type mapboxgl from "mapbox-gl";

interface MediaPin {
  id: string;
  url: string;
  type: "image" | "video";
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: string;
  filename?: string;
}

/**
 * PilotViewCockpit
 *
 * Interactive map view for drone footage with:
 * - Mapbox map display
 * - Fly controls (zoom, rotate, pitch)
 * - Media pins on the map
 * - Media detail sidebar (opens on pin click)
 * - Download functionality
 *
 * This page is isolated to prevent conflicts with existing components.
 */
export default function PilotViewCockpit() {
  const { projectId } = useParams<{ projectId: string }>();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaPin | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mediaPins, setMediaPins] = useState<MediaPin[]>([]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Import mapbox-gl dynamically to avoid SSR issues
    import("mapbox-gl").then((mapboxgl) => {
      if (map.current) return;

      // Initialize map with default center
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-v9",
        center: [-96.7969, 32.7767], // Default to Dallas, TX
        zoom: 12,
        pitch: 0,
        bearing: 0,
      });

      // Add navigation control
      map.current.addControl(new mapboxgl.NavigationControl(), "top-left");

      // Simulate loading media pins (replace with actual API call)
      setTimeout(() => {
        // Example media pins
        const mockPins: MediaPin[] = [
          {
            id: "1",
            url: "https://via.placeholder.com/400x300?text=Drone+Photo+1",
            type: "image",
            latitude: 32.7767,
            longitude: -96.7969,
            altitude: 120.5,
            timestamp: new Date().toISOString(),
            filename: "drone-photo-001.jpg",
          },
          {
            id: "2",
            url: "https://via.placeholder.com/400x300?text=Drone+Photo+2",
            type: "image",
            latitude: 32.7775,
            longitude: -96.7955,
            altitude: 135.2,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            filename: "drone-photo-002.jpg",
          },
        ];

        setMediaPins(mockPins);

        // Add markers to map
        mockPins.forEach((pin) => {
          if (pin.latitude && pin.longitude && map.current) {
            const marker = document.createElement("div");
            marker.className =
              "w-8 h-8 bg-emerald-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-emerald-600 transition-colors";
            marker.title = pin.filename || `Media ${pin.id}`;

            new mapboxgl.Marker({ element: marker })
              .setLngLat([pin.longitude, pin.latitude])
              .addTo(map.current!)
              .getElement()
              .addEventListener("click", () => {
                setSelectedMedia(pin);
                setIsSidebarOpen(true);
              });
          }
        });

        setIsLoading(false);
      }, 500);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-white">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="bg-white/90 hover:bg-white text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "auto" }}
      />

      {/* Mapbox Fly Controls */}
      <MapboxFlyControls map={map.current} />

      {/* Media Detail Sidebar */}
      <MediaDetailSidebar
        media={selectedMedia}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Project Info */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 rounded-lg px-4 py-2 text-sm text-gray-900">
        <p className="font-medium">Project ID: {projectId}</p>
        <p className="text-gray-600">{mediaPins.length} media pins</p>
      </div>
    </div>
  );
}
