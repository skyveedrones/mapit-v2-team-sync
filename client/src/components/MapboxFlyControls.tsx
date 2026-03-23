import { useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Compass, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type mapboxgl from "mapbox-gl";

interface MapboxFlyControlsProps {
  map: mapboxgl.Map | null;
  className?: string;
}

/**
 * MapboxFlyControls
 *
 * Provides standard Mapbox navigation controls:
 * - Zoom In/Out
 * - Rotate (Compass)
 * - Pitch (3D tilt)
 *
 * Positioned in the top-right of the map container.
 * Does not block map interaction or other controls.
 */
export function MapboxFlyControls({ map, className = "" }: MapboxFlyControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map || !controlsRef.current) return;

    // Ensure controls are visible and properly positioned
    controlsRef.current.style.position = "absolute";
    controlsRef.current.style.top = "12px";
    controlsRef.current.style.right = "12px";
    controlsRef.current.style.zIndex = "10";
    controlsRef.current.style.pointerEvents = "auto";
  }, [map]);

  const handleZoomIn = () => {
    if (map) {
      map.easeTo({
        zoom: map.getZoom() + 1,
        duration: 300,
      });
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.easeTo({
        zoom: Math.max(map.getZoom() - 1, 0),
        duration: 300,
      });
    }
  };

  const handleRotate = () => {
    if (map) {
      map.easeTo({
        bearing: 0,
        duration: 300,
      });
    }
  };

  const handlePitch = () => {
    if (map) {
      // Toggle between 0 and 45 degrees pitch
      const currentPitch = map.getPitch();
      const newPitch = currentPitch > 20 ? 0 : 45;
      map.easeTo({
        pitch: newPitch,
        duration: 300,
      });
    }
  };

  return (
    <div
      ref={controlsRef}
      className={`flex flex-col gap-2 ${className}`}
      style={{ pointerEvents: "auto" }}
    >
      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 bg-white rounded-lg shadow-md border border-gray-200">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleZoomIn}
          title="Zoom In"
          className="h-9 w-9 p-0 hover:bg-gray-100"
        >
          <ZoomIn className="h-4 w-4 text-gray-700" />
        </Button>
        <div className="h-px bg-gray-200" />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="h-9 w-9 p-0 hover:bg-gray-100"
        >
          <ZoomOut className="h-4 w-4 text-gray-700" />
        </Button>
      </div>

      {/* Rotation & Pitch Controls */}
      <div className="flex flex-col gap-1 bg-white rounded-lg shadow-md border border-gray-200">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRotate}
          title="Reset Rotation"
          className="h-9 w-9 p-0 hover:bg-gray-100"
        >
          <Compass className="h-4 w-4 text-gray-700" />
        </Button>
        <div className="h-px bg-gray-200" />
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePitch}
          title="Toggle 3D Pitch"
          className="h-9 w-9 p-0 hover:bg-gray-100"
        >
          <Eye className="h-4 w-4 text-gray-700" />
        </Button>
      </div>
    </div>
  );
}
