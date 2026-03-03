/**
 * Metadata Extraction Utility
 * Extracts EXIF, GPS, and other metadata from image files while preserving data integrity
 * Used for drone mapping accuracy and GIS reporting
 */

import ExifParser from "exif-parser";

export interface ImageMetadata {
  // EXIF Data
  make?: string; // Camera manufacturer (e.g., "DJI")
  model?: string; // Camera model (e.g., "Phantom 4 Pro")
  dateTime?: Date; // Photo capture timestamp
  orientation?: number; // Image orientation (1-8)
  
  // GPS Data (critical for mapping accuracy)
  gpsLatitude?: number; // Latitude in decimal degrees
  gpsLongitude?: number; // Longitude in decimal degrees
  gpsAltitude?: number; // Altitude in meters
  gpsAccuracy?: number; // GPS accuracy/precision in meters
  
  // Image Dimensions
  width?: number;
  height?: number;
  
  // Camera Settings
  focalLength?: number; // Focal length in mm
  fNumber?: number; // F-number (aperture)
  exposureTime?: number; // Shutter speed in seconds
  iso?: number; // ISO sensitivity
  
  // Drone-specific metadata
  droneModel?: string; // Extracted from make/model
  flightHeight?: number; // Altitude above ground (if available)
  gimbalRoll?: number; // Gimbal orientation
  gimbalPitch?: number;
  gimbalYaw?: number;
}

/**
 * Extract metadata from image buffer
 * Preserves all EXIF data without modification
 */
export async function extractImageMetadata(
  imageBuffer: Buffer
): Promise<ImageMetadata> {
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();
    
    if (!result.tags) {
      console.warn("[Metadata] No EXIF tags found in image");
      return {};
    }

    const tags = result.tags;
    const metadata: ImageMetadata = {};

    // Extract EXIF data
    if (tags.Make) metadata.make = tags.Make;
    if (tags.Model) metadata.model = tags.Model;
    if (tags.DateTime) {
      try {
        // EXIF DateTime format: "YYYY:MM:DD HH:MM:SS"
        const dateStr = tags.DateTime as string;
        metadata.dateTime = new Date(dateStr.replace(/:/g, "-").replace(" ", "T"));
      } catch (e) {
        console.warn("[Metadata] Failed to parse DateTime:", tags.DateTime);
      }
    }
    if (tags.Orientation) metadata.orientation = tags.Orientation as number;

    // Extract GPS data (critical for mapping)
    if (tags.GPSLatitude && tags.GPSLatitudeRef) {
      const gpsLat = Array.isArray(tags.GPSLatitude) ? tags.GPSLatitude : [tags.GPSLatitude];
      metadata.gpsLatitude = convertGPSToDecimal(
        gpsLat as unknown as number[],
        tags.GPSLatitudeRef as string
      );
    }
    if (tags.GPSLongitude && tags.GPSLongitudeRef) {
      const gpsLon = Array.isArray(tags.GPSLongitude) ? tags.GPSLongitude : [tags.GPSLongitude];
      metadata.gpsLongitude = convertGPSToDecimal(
        gpsLon as unknown as number[],
        tags.GPSLongitudeRef as string
      );
    }
    if (tags.GPSAltitude) {
      metadata.gpsAltitude = tags.GPSAltitude as number;
    }
    if (tags.GPSDOP) {
      // DOP (Dilution of Precision) indicates GPS accuracy
      // Lower values = better accuracy
      metadata.gpsAccuracy = tags.GPSDOP as number;
    }

    // Extract image dimensions
    if (tags.PixelXDimension) metadata.width = tags.PixelXDimension as number;
    if (tags.PixelYDimension) metadata.height = tags.PixelYDimension as number;

    // Extract camera settings
    if (tags.FocalLength) metadata.focalLength = tags.FocalLength as number;
    if (tags.FNumber) metadata.fNumber = tags.FNumber as number;
    if (tags.ExposureTime) metadata.exposureTime = tags.ExposureTime as number;
    if (tags.ISOSpeedRatings) metadata.iso = tags.ISOSpeedRatings as number;

    // Detect drone model from make/model
    if (metadata.make && metadata.make.toLowerCase().includes("dji")) {
      metadata.droneModel = `${metadata.make} ${metadata.model || ""}`.trim();
    }

    // Extract drone-specific metadata if available (varies by drone)
    // DJI drones store additional data in MakerNote tags
    if (tags.MakerNote) {
      // MakerNote contains drone-specific data
      // This would require drone-specific parsing libraries
      console.log("[Metadata] MakerNote data available for drone-specific parsing");
    }

    console.log("[Metadata] Successfully extracted metadata:", {
      make: metadata.make,
      model: metadata.model,
      gps: metadata.gpsLatitude ? `${metadata.gpsLatitude}, ${metadata.gpsLongitude}` : "Not available",
      altitude: metadata.gpsAltitude,
      dateTime: metadata.dateTime,
    });

    return metadata;
  } catch (error) {
    console.error("[Metadata] Error extracting metadata:", error);
    // Return empty metadata object instead of throwing
    // This ensures upload continues even if metadata extraction fails
    return {};
  }
}

/**
 * Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) to decimal degrees
 * GPS data in EXIF is stored as: [degrees, minutes, seconds]
 */
function convertGPSToDecimal(
  gpsArray: number[],
  ref: string
): number {
  if (!Array.isArray(gpsArray) || gpsArray.length < 3) {
    return 0;
  }

  const degrees = gpsArray[0];
  const minutes = gpsArray[1];
  const seconds = gpsArray[2];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Apply reference direction (N/S for latitude, E/W for longitude)
  if (ref === "S" || ref === "W") {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Format metadata for display
 */
export function formatMetadataForDisplay(metadata: ImageMetadata): string {
  const parts: string[] = [];

  if (metadata.droneModel) parts.push(`Drone: ${metadata.droneModel}`);
  if (metadata.dateTime) parts.push(`Captured: ${metadata.dateTime.toLocaleString()}`);
  if (metadata.gpsLatitude && metadata.gpsLongitude) {
    parts.push(`Location: ${metadata.gpsLatitude.toFixed(6)}, ${metadata.gpsLongitude.toFixed(6)}`);
  }
  if (metadata.gpsAltitude) parts.push(`Altitude: ${metadata.gpsAltitude.toFixed(1)}m`);
  if (metadata.width && metadata.height) {
    parts.push(`Resolution: ${metadata.width}x${metadata.height}`);
  }
  if (metadata.iso) parts.push(`ISO: ${metadata.iso}`);
  if (metadata.fNumber) parts.push(`F/${metadata.fNumber}`);
  if (metadata.focalLength) parts.push(`Focal Length: ${metadata.focalLength}mm`);

  return parts.join(" | ");
}

/**
 * Validate GPS accuracy for mapping-grade precision
 * Returns true if GPS data meets mapping-grade requirements (1.0m - 2.0m accuracy)
 */
export function isMapGradeAccuracy(metadata: ImageMetadata): boolean {
  if (!metadata.gpsAccuracy) return false;
  
  // DOP values: < 5 is excellent, 5-10 is good, > 10 is poor
  // For mapping-grade: DOP should be < 5 (which gives ~1-2m accuracy)
  return metadata.gpsAccuracy < 5;
}

/**
 * Create GeoJSON feature from image metadata for mapping
 */
export function createGeoJSONFeature(
  metadata: ImageMetadata,
  imageUrl: string,
  imageId: number
) {
  if (!metadata.gpsLatitude || !metadata.gpsLongitude) {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [metadata.gpsLongitude, metadata.gpsLatitude],
    },
    properties: {
      id: imageId,
      url: imageUrl,
      timestamp: metadata.dateTime?.toISOString(),
      altitude: metadata.gpsAltitude,
      accuracy: metadata.gpsAccuracy,
      camera: metadata.droneModel || `${metadata.make} ${metadata.model}`,
      isMapGrade: isMapGradeAccuracy(metadata),
    },
  };
}
