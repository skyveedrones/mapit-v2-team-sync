import { useState, useEffect } from "react";
import { X, Download, MapPin, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface MediaMetadata {
  id: string;
  url: string;
  type: "image" | "video";
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: string;
  filename?: string;
}

interface MediaDetailSidebarProps {
  media: MediaMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MediaDetailSidebar
 *
 * Displays detailed information about a selected media pin:
 * - Media preview (image or video thumbnail)
 * - GPS coordinates (latitude, longitude)
 * - Altitude information
 * - Timestamp
 * - Download button
 *
 * Slides in from the right side of the screen.
 * Does not block map controls or interactions.
 */
export function MediaDetailSidebar({
  media,
  isOpen,
  onClose,
}: MediaDetailSidebarProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!media) return;

    try {
      setIsLoading(true);
      const response = await fetch(media.url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = media.filename || `media-${media.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Media downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download media");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCoordinate = (value?: number) => {
    return value !== undefined ? value.toFixed(6) : "N/A";
  };

  const formatAltitude = (value?: number) => {
    return value !== undefined ? `${value.toFixed(2)} m` : "N/A";
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-lg z-40 transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {media ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                Media Details
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Media Preview */}
              <Card className="overflow-hidden bg-gray-100">
                {media.type === "image" ? (
                  <img
                    src={media.url}
                    alt="Media preview"
                    className="w-full h-auto object-cover max-h-64"
                  />
                ) : (
                  <video
                    src={media.url}
                    className="w-full h-auto object-cover max-h-64"
                    controls
                  />
                )}
              </Card>

              {/* Metadata Section */}
              <div className="space-y-3">
                {/* GPS Coordinates */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    GPS Coordinates
                  </div>
                  <div className="ml-6 space-y-1 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Latitude:</span>{" "}
                      {formatCoordinate(media.latitude)}
                    </div>
                    <div>
                      <span className="font-medium">Longitude:</span>{" "}
                      {formatCoordinate(media.longitude)}
                    </div>
                  </div>
                </div>

                {/* Altitude */}
                {media.altitude !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Gauge className="h-4 w-4 text-emerald-600" />
                      Altitude
                    </div>
                    <div className="ml-6 text-sm text-gray-600">
                      {formatAltitude(media.altitude)}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                {media.timestamp && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Captured
                    </div>
                    <div className="ml-0 text-sm text-gray-600">
                      {formatTimestamp(media.timestamp)}
                    </div>
                  </div>
                )}

                {/* Filename */}
                {media.filename && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Filename
                    </div>
                    <div className="ml-0 text-sm text-gray-600 break-all">
                      {media.filename}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Download Button */}
            <div className="sticky bottom-0 p-4 border-t border-gray-200 bg-white">
              <Button
                onClick={handleDownload}
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                {isLoading ? "Downloading..." : "Download Media"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No media selected</p>
          </div>
        )}
      </div>
    </>
  );
}
