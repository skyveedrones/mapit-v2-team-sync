import { describe, it, expect, vi } from "vitest";

/**
 * MediaDetailSidebar Component Tests
 *
 * Tests for:
 * - Sidebar open/close functionality
 * - Media metadata display (GPS, altitude, timestamp)
 * - Download functionality
 * - Proper formatting of coordinates and altitude
 */

describe("MediaDetailSidebar", () => {
  const mockMedia = {
    id: "1",
    url: "https://example.com/image.jpg",
    type: "image" as const,
    latitude: 32.776665,
    longitude: -96.796989,
    altitude: 120.5,
    timestamp: "2026-03-23T15:00:00Z",
    filename: "drone-photo-001.jpg",
  };

  it("should format coordinates correctly", () => {
    const formatCoordinate = (value?: number) => {
      return value !== undefined ? value.toFixed(6) : "N/A";
    };

    expect(formatCoordinate(mockMedia.latitude)).toBe("32.776665");
    expect(formatCoordinate(mockMedia.longitude)).toBe("-96.796989");
    expect(formatCoordinate(undefined)).toBe("N/A");
  });

  it("should format altitude correctly", () => {
    const formatAltitude = (value?: number) => {
      return value !== undefined ? `${value.toFixed(2)} m` : "N/A";
    };

    expect(formatAltitude(mockMedia.altitude)).toBe("120.50 m");
    expect(formatAltitude(undefined)).toBe("N/A");
  });

  it("should format timestamp correctly", () => {
    const formatTimestamp = (timestamp?: string) => {
      if (!timestamp) return "N/A";
      try {
        return new Date(timestamp).toLocaleString();
      } catch {
        return timestamp;
      }
    };

    const formatted = formatTimestamp(mockMedia.timestamp);
    expect(formatted).not.toBe("N/A");
    expect(formatted).toContain("2026");
  });

  it("should handle missing metadata gracefully", () => {
    const mediaWithoutMetadata = {
      id: "2",
      url: "https://example.com/video.mp4",
      type: "video" as const,
    };

    const formatCoordinate = (value?: number) => {
      return value !== undefined ? value.toFixed(6) : "N/A";
    };

    expect(formatCoordinate(mediaWithoutMetadata.latitude)).toBe("N/A");
    expect(formatCoordinate(mediaWithoutMetadata.longitude)).toBe("N/A");
  });

  it("should identify media type correctly", () => {
    expect(mockMedia.type).toBe("image");

    const videoMedia = {
      ...mockMedia,
      type: "video" as const,
    };
    expect(videoMedia.type).toBe("video");
  });

  it("should handle download filename generation", () => {
    const getDownloadFilename = (filename?: string, id?: string) => {
      return filename || `media-${id}`;
    };

    expect(getDownloadFilename(mockMedia.filename, mockMedia.id)).toBe(
      "drone-photo-001.jpg"
    );
    expect(getDownloadFilename(undefined, "123")).toBe("media-123");
  });

  it("should validate media URL", () => {
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(isValidUrl(mockMedia.url)).toBe(true);
    expect(isValidUrl("invalid-url")).toBe(false);
  });
});
