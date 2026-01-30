/**
 * Project Report Generation Service
 * Generates PDF reports with project info, map, and media gallery
 */

import { Project, Media } from "../drizzle/schema";
import sharp from "sharp";

// Resolution presets for media in reports
export const RESOLUTION_PRESETS = {
  high: { width: 1920, quality: 90, label: "High (1920px)" },
  medium: { width: 1280, quality: 80, label: "Medium (1280px)" },
  low: { width: 800, quality: 70, label: "Low (800px)" },
  thumbnail: { width: 400, quality: 60, label: "Thumbnail (400px)" },
} as const;

export type ResolutionPreset = keyof typeof RESOLUTION_PRESETS;

export interface ReportOptions {
  projectId: number;
  mediaIds: number[];
  resolution: ResolutionPreset;
  includeWatermark: boolean;
  watermarkUrl?: string;
  watermarkPosition?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
  watermarkOpacity?: number;
  watermarkScale?: number;
}

export interface ReportData {
  project: Project;
  media: Media[];
  mapImageUrl?: string;
  generatedAt: Date;
}

import { ENV } from "./_core/env";

// Map style options
export type MapStyle = "roadmap" | "satellite" | "hybrid" | "terrain";

export const MAP_STYLE_OPTIONS: { value: MapStyle; label: string }[] = [
  { value: "hybrid", label: "Hybrid (Satellite + Labels)" },
  { value: "satellite", label: "Satellite" },
  { value: "roadmap", label: "Roadmap" },
  { value: "terrain", label: "Terrain" },
];

export interface StaticMapOptions {
  mapStyle?: MapStyle;
  showFlightPath?: boolean;
}

/**
 * Generate a static Google Maps URL with markers for all GPS points
 * Uses the Manus Maps proxy for authentication
 */
export function generateStaticMapUrl(
  media: Media[],
  options: StaticMapOptions = {}
): string | null {
  const { mapStyle = "hybrid", showFlightPath = true } = options;
  
  // Sort media by capture time for flight path
  const gpsMedia = media
    .filter(m => m.latitude && m.longitude)
    .sort((a, b) => {
      const dateA = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
      const dateB = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
      return dateA - dateB;
    });
  
  if (gpsMedia.length === 0) {
    return null;
  }

  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  
  if (!baseUrl || !apiKey) {
    console.warn("[Report] Maps proxy credentials not configured");
    return null;
  }

  // Calculate center point and zoom level based on bounds
  const lats = gpsMedia.map(m => parseFloat(m.latitude!));
  const lngs = gpsMedia.map(m => parseFloat(m.longitude!));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  
  // Calculate appropriate zoom level based on bounds
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  let zoom = 14;
  if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;
  else if (maxDiff > 0.01) zoom = 14;
  else zoom = 15;

  // Build markers string - limit to 100 markers for URL length
  const markersToShow = gpsMedia.slice(0, 100);
  const markers = markersToShow
    .map(m => `${m.latitude},${m.longitude}`)
    .join("|");

  // Generate static map URL via Manus proxy
  const proxyUrl = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    center: `${centerLat},${centerLng}`,
    zoom: String(zoom),
    size: "800x500",
    maptype: mapStyle,
    markers: `color:red|size:small|${markers}`,
    key: apiKey,
  });

  // Add flight path polyline if enabled and we have multiple points
  if (showFlightPath && gpsMedia.length >= 2) {
    // Build path string - Google Static Maps uses path parameter for polylines
    // Format: path=color:0xff0000ff|weight:3|lat1,lng1|lat2,lng2|...
    const pathPoints = markersToShow
      .map(m => `${m.latitude},${m.longitude}`)
      .join("|");
    params.append("path", `color:0x10B981FF|weight:3|${pathPoints}`);
  }

  return `${proxyUrl}/v1/maps/proxy/maps/api/staticmap?${params.toString()}`;
}

/**
 * Fetch static map image and convert to base64 data URL
 */
export async function fetchStaticMapAsDataUrl(
  media: Media[],
  options: StaticMapOptions = {}
): Promise<string | null> {
  const mapUrl = generateStaticMapUrl(media, options);
  if (!mapUrl) return null;
  
  try {
    const response = await fetch(mapUrl);
    if (!response.ok) {
      console.error(`[Report] Failed to fetch static map: ${response.status}`);
      return null;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[Report] Error fetching static map:", error);
    return null;
  }
}

/**
 * Resize an image to the specified resolution
 */
export async function resizeImage(
  imageBuffer: Buffer,
  resolution: ResolutionPreset
): Promise<Buffer> {
  const preset = RESOLUTION_PRESETS[resolution];
  
  return sharp(imageBuffer)
    .resize(preset.width, null, { 
      withoutEnlargement: true,
      fit: "inside"
    })
    .jpeg({ quality: preset.quality })
    .toBuffer();
}

/**
 * Apply watermark to an image if requested
 */
export async function processImageForReport(
  imageBuffer: Buffer,
  resolution: ResolutionPreset,
  watermarkOptions?: {
    watermarkBuffer: Buffer;
    position: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
    opacity: number;
    scale: number;
  }
): Promise<Buffer> {
  // First resize the image
  let processedBuffer = await resizeImage(imageBuffer, resolution);
  
  // Apply watermark if provided
  if (watermarkOptions) {
    const { watermarkBuffer, position, opacity, scale } = watermarkOptions;
    
    // Get image dimensions
    const metadata = await sharp(processedBuffer).metadata();
    const imageWidth = metadata.width || 800;
    const imageHeight = metadata.height || 600;
    
    // Calculate watermark size
    const watermarkSize = Math.round(Math.min(imageWidth, imageHeight) * (scale / 100));
    
    // Resize watermark
    const resizedWatermark = await sharp(watermarkBuffer)
      .resize(watermarkSize, watermarkSize, { fit: "inside" })
      .png()
      .toBuffer();
    
    // Calculate position
    const wmMeta = await sharp(resizedWatermark).metadata();
    const wmWidth = wmMeta.width || watermarkSize;
    const wmHeight = wmMeta.height || watermarkSize;
    
    let left = 0;
    let top = 0;
    const padding = 20;
    
    switch (position) {
      case "top-left":
        left = padding;
        top = padding;
        break;
      case "top-right":
        left = imageWidth - wmWidth - padding;
        top = padding;
        break;
      case "center":
        left = Math.round((imageWidth - wmWidth) / 2);
        top = Math.round((imageHeight - wmHeight) / 2);
        break;
      case "bottom-left":
        left = padding;
        top = imageHeight - wmHeight - padding;
        break;
      case "bottom-right":
        left = imageWidth - wmWidth - padding;
        top = imageHeight - wmHeight - padding;
        break;
    }
    
    // Apply watermark with opacity
    const watermarkWithOpacity = await sharp(resizedWatermark)
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(255 * (opacity / 100))]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in"
      }])
      .png()
      .toBuffer();
    
    processedBuffer = await sharp(processedBuffer)
      .composite([{
        input: watermarkWithOpacity,
        left: Math.max(0, left),
        top: Math.max(0, top),
        blend: "over"
      }])
      .jpeg({ quality: RESOLUTION_PRESETS[resolution].quality })
      .toBuffer();
  }
  
  return processedBuffer;
}

/**
 * Generate HTML content for the report
 */
export function generateReportHtml(
  project: Project,
  mediaImages: { filename: string; dataUrl: string }[],
  mapImageDataUrl: string | null,
  generatedAt: Date,
  userLogoUrl?: string
): string {
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
  };

  const mediaHtml = mediaImages.map(img => `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <img src="${img.dataUrl}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;" />
      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 8px;">${img.filename}</p>
    </div>
  `).join("");

  const mapHtml = mapImageDataUrl ? `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333;">Project Map</h2>
      <img src="${mapImageDataUrl}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;" />
      <p style="text-align: center; font-style: italic; color: #666; margin-top: 8px;">Showing ${mediaImages.length} GPS locations</p>
    </div>
  ` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 1in;
      size: letter;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    h2 {
      font-size: 20px;
      font-weight: bold;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }
    .subtitle {
      text-align: center;
      font-size: 22px;
      margin-bottom: 5px;
    }
    .date {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .info-row {
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: bold;
      display: inline;
    }
    .info-value {
      display: inline;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
    <div style="flex: 1;">
      <h1 style="text-align: left; margin: 0;">Project Report</h1>
      <p class="subtitle" style="text-align: left;">${project.name}</p>
      <p class="date" style="text-align: left;">Report Generated On: ${formatDate(generatedAt)}</p>
    </div>
    ${userLogoUrl ? `
      <div style="flex-shrink: 0; margin-left: 20px;">
        <img src="${userLogoUrl}" alt="Company Logo" style="max-width: 150px; max-height: 80px; object-fit: contain;" />
      </div>
    ` : ""}
  </div>
  
  <h2 style="margin-top: 20px;">Project Information</h2>
  <div class="info-row"><span class="info-label">Description:</span> <span class="info-value">${project.description || "N/A"}</span></div>
  <div class="info-row"><span class="info-label">Location:</span> <span class="info-value">${project.location || "N/A"}</span></div>
  <div class="info-row"><span class="info-label">Client:</span> <span class="info-value">${project.clientName || "N/A"}</span></div>
  <div class="info-row"><span class="info-label">Flight Date:</span> <span class="info-value">${formatDate(project.flightDate)}</span></div>
  <div class="info-row"><span class="info-label">Status:</span> <span class="info-value">${project.status || "N/A"}</span></div>
  <div class="info-row"><span class="info-label">Created Date:</span> <span class="info-value">${formatDate(project.createdAt)}</span></div>
  
  ${(project.dronePilot || project.faaLicenseNumber || project.laancAuthNumber) ? `
  <h2 style="margin-top: 25px;">Pilot Information</h2>
  <div class="info-row"><span class="info-label">Drone Pilot:</span> <span class="info-value">${project.dronePilot || "N/A"}</span></div>
  <div class="info-row"><span class="info-label">FAA License #:</span> <span class="info-value">${project.faaLicenseNumber || "N/A"}</span></div>
  <div class="info-row"><span class="info-label">LAANC Authorization #:</span> <span class="info-value">${project.laancAuthNumber || "N/A"}</span></div>
  ` : ""}
  
  ${mapHtml}
  
  ${mediaImages.length > 0 ? `
    <div class="page-break"></div>
    <h2>Media Gallery</h2>
    ${mediaHtml}
  ` : ""}
</body>
</html>
  `;
}
