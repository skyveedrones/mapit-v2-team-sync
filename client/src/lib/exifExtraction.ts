/**
 * Client-Side EXIF/XMP Extraction Utility
 * Extracts drone telemetry immediately upon file selection
 * Preserves GPS and altitude data independent of file format conversion
 */

import exifr from 'exifr';

export interface DroneTelementry {
  latitude: number | null;
  longitude: number | null;
  absoluteAltitude: number | null;
  relativeAltitude: number | null;
  gimbalPitch: number | null;
  capturedAt: Date | null;
  rawMetadata: Record<string, any> | null;
}

/**
 * Extract drone telemetry from a file before any format conversion
 * Uses exifr to read EXIF, XMP, and IPTC data from images
 * 
 * DJI drones store critical mapping data in:
 * - EXIF GPS tags (latitude, longitude, altitude)
 * - XMP tags (gimbal pitch, relative altitude)
 */
export async function extractDroneTelemetry(file: File): Promise<DroneTelementry> {
  try {
    console.log(`[EXIF] Extracting telemetry from: ${file.name} (${file.type})`);
    
    // Parse EXIF, XMP, and IPTC data from the file
    const data = await exifr.parse(file, {
      gps: true,
      xmp: true,
      iptc: true,
      pick: [
        'GPSLatitude',
        'GPSLongitude',
        'GPSAltitude',
        'RelativeAltitude',
        'GimbalPitchDegree',
        'DateTimeOriginal',
        'DateTime',
        'Make',
        'Model',
      ],
    });

    console.log(`[EXIF] Raw extracted data:`, data);

    // Extract GPS coordinates
    const latitude = data?.GPSLatitude ?? null;
    const longitude = data?.GPSLongitude ?? null;

    // Extract altitude (absolute from GPS, relative from XMP)
    const absoluteAltitude = data?.GPSAltitude ?? null;
    const relativeAltitude = data?.RelativeAltitude ?? null;

    // Extract gimbal pitch (DJI-specific XMP tag)
    const gimbalPitch = data?.GimbalPitchDegree ?? null;

    // Extract capture timestamp
    let capturedAt: Date | null = null;
    if (data?.DateTimeOriginal) {
      capturedAt = new Date(data.DateTimeOriginal);
    } else if (data?.DateTime) {
      capturedAt = new Date(data.DateTime);
    }

    const result: DroneTelementry = {
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      absoluteAltitude: absoluteAltitude ? Number(absoluteAltitude) : null,
      relativeAltitude: relativeAltitude ? Number(relativeAltitude) : null,
      gimbalPitch: gimbalPitch ? Number(gimbalPitch) : null,
      capturedAt,
      rawMetadata: data || null,
    };

    console.log(`[EXIF] Extracted telemetry:`, {
      latitude: result.latitude,
      longitude: result.longitude,
      absoluteAltitude: result.absoluteAltitude,
      relativeAltitude: result.relativeAltitude,
      gimbalPitch: result.gimbalPitch,
      capturedAt: result.capturedAt?.toISOString(),
    });

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[EXIF] Failed to extract telemetry from ${file.name}: ${msg}`);
    
    // Return empty telemetry on extraction failure
    return {
      latitude: null,
      longitude: null,
      absoluteAltitude: null,
      relativeAltitude: null,
      gimbalPitch: null,
      capturedAt: null,
      rawMetadata: null,
    };
  }
}

/**
 * Validate that extracted telemetry has meaningful GPS data
 */
export function hasGpsData(telemetry: DroneTelementry): boolean {
  return telemetry.latitude !== null && telemetry.longitude !== null;
}

/**
 * Format telemetry for display
 */
export function formatTelemetry(telemetry: DroneTelementry): string {
  const parts: string[] = [];
  
  if (telemetry.latitude && telemetry.longitude) {
    parts.push(`GPS: ${telemetry.latitude.toFixed(7)}, ${telemetry.longitude.toFixed(7)}`);
  }
  
  if (telemetry.absoluteAltitude) {
    parts.push(`Alt: ${telemetry.absoluteAltitude.toFixed(1)}m`);
  }
  
  if (telemetry.gimbalPitch) {
    parts.push(`Pitch: ${telemetry.gimbalPitch.toFixed(1)}°`);
  }
  
  if (telemetry.capturedAt) {
    parts.push(`Captured: ${telemetry.capturedAt.toLocaleString()}`);
  }
  
  return parts.join(' | ') || 'No telemetry data';
}
