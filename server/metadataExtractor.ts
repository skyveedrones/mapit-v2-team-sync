/**
 * Metadata Extraction Utility
 * Extracts EXIF, GPS, and other metadata from image files while preserving data integrity
 * Used for drone mapping accuracy and GIS reporting
 */

import exifr from 'exifr';

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
 * Uses exifr library for consistent GPS coordinate extraction
 */
export async function extractImageMetadata(
  imageBuffer: Buffer
): Promise<ImageMetadata> {
  try {
    // Use exifr to parse EXIF data with explicit GPS handling
    const data = await exifr.parse(imageBuffer, {
      gps: true,
      pick: ['latitude', 'longitude', 'GPSAltitude', 'CreateDate', 'Make', 'Model', 'Orientation', 'PixelXDimension', 'PixelYDimension', 'FocalLength', 'FNumber', 'ExposureTime', 'ISOSpeedRatings']
    });

    if (!data) {
      console.warn("[Metadata] No EXIF data found in image");
      return {};
    }

    const metadata: ImageMetadata = {};

    // Extract EXIF data
    if (data.Make) metadata.make = String(data.Make);
    if (data.Model) metadata.model = String(data.Model);
    if (data.CreateDate) {
      try {
        metadata.dateTime = new Date(data.CreateDate);
      } catch (e) {
        console.warn("[Metadata] Failed to parse CreateDate:", data.CreateDate);
      }
    }
    if (data.Orientation) metadata.orientation = Number(data.Orientation);

    // Extract GPS data with validation
    // exifr returns latitude/longitude as numbers directly
    const lat = data.latitude ? Number(data.latitude) : null;
    const lng = data.longitude ? Number(data.longitude) : null;
    
    // Validate coordinate ranges to filter out garbage data
    const isValidLat = lat !== null && lat >= -90 && lat <= 90;
    const isValidLng = lng !== null && lng >= -180 && lng <= 180;
    
    if (isValidLat) {
      metadata.gpsLatitude = lat;
    } else if (lat !== null) {
      console.warn(`[Metadata] Invalid latitude value: ${lat} (outside -90 to 90 range)`);
    }
    
    if (isValidLng) {
      metadata.gpsLongitude = lng;
    } else if (lng !== null) {
      console.warn(`[Metadata] Invalid longitude value: ${lng} (outside -180 to 180 range)`);
    }

    // Extract altitude
    if (data.GPSAltitude) {
      metadata.gpsAltitude = Number(data.GPSAltitude);
    }

    // Extract image dimensions
    if (data.PixelXDimension) metadata.width = Number(data.PixelXDimension);
    if (data.PixelYDimension) metadata.height = Number(data.PixelYDimension);

    // Extract camera settings
    if (data.FocalLength) metadata.focalLength = Number(data.FocalLength);
    if (data.FNumber) metadata.fNumber = Number(data.FNumber);
    if (data.ExposureTime) metadata.exposureTime = Number(data.ExposureTime);
    if (data.ISOSpeedRatings) metadata.iso = Number(data.ISOSpeedRatings);

    // Detect drone model from make/model
    if (metadata.make && metadata.make.toLowerCase().includes("dji")) {
      metadata.droneModel = `${metadata.make} ${metadata.model || ""}`.trim();
    }

    console.log("[Metadata] Successfully extracted metadata:", {
      make: metadata.make,
      model: metadata.model,
      gps: metadata.gpsLatitude && metadata.gpsLongitude 
        ? `${metadata.gpsLatitude.toFixed(6)}, ${metadata.gpsLongitude.toFixed(6)}` 
        : "Not available",
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
