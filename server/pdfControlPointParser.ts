/**
 * PDF Control Point Table Parser
 *
 * Extracts CONTROL POINT tables from survey/engineering PDFs.
 *
 * Strategy 1 (fast): pdfjs-dist text extraction — works for PDFs with embedded digital text.
 * Strategy 2 (OCR fallback): Convert PDF to image via pdftoppm, crop bottom-left region,
 *   upload to R2, and use LLM vision to OCR the Control Points table.
 *
 * OCR trigger keywords: CONTROL POINTS, XCUT, NORTHING, EASTING, ELEV, ELEVATION,
 *   BENCHMARK, MONUMENT, N:, E:, TEXAS STATE PLANE, NAD-83, COORDINATE SYSTEM
 *
 * STRICT VALIDATION RULES:
 * - Northing and Easting values are range-validated for US State Plane Survey Feet.
 * - Elevation is optional.
 * - If column order is ambiguous, the parser fails gracefully with a descriptive error.
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface ControlPoint {
  pointId: string;
  northing: number;
  easting: number;
  elevation: number | null;
  description: string;
}

export interface PdfParseResult {
  success: boolean;
  points: ControlPoint[];
  totalPages: number;
  tablesFound: number;
  warnings: string[];
  error?: string;
  method?: 'text' | 'ocr';
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

function parseNum(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function validateCoordinates(northing: number, easting: number): string | null {
  if (northing < 0 || northing > 20_000_000) {
    return `Northing ${northing} is outside plausible US Survey Feet range (0–20,000,000)`;
  }
  if (easting < 0 || easting > 5_000_000) {
    return `Easting ${easting} is outside plausible US Survey Feet range (0–5,000,000)`;
  }
  return null;
}

/**
 * Extract text items with x/y positions from all pages of a PDF buffer.
 */
async function extractPdfItems(pdfBuffer: Buffer): Promise<{ items: TextItem[][]; pages: number }> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string) as any;
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const allPageItems: TextItem[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      .filter((item: any) => 'str' in item && item.str.trim().length > 0)
      .map((item: any) => ({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: item.transform[5],
      }));
    allPageItems.push(items);
  }

  return { items: allPageItems, pages: doc.numPages };
}

/**
 * Group text items into rows by y-coordinate with a tolerance of ±4 units.
 */
function groupIntoRows(items: TextItem[], yTolerance = 4): TextItem[][] {
  const rows: { centerY: number; items: TextItem[] }[] = [];

  for (const item of items) {
    const existing = rows.find(r => Math.abs(r.centerY - item.y) <= yTolerance);
    if (existing) {
      existing.items.push(item);
      existing.centerY = existing.items.reduce((s, i) => s + i.y, 0) / existing.items.length;
    } else {
      rows.push({ centerY: item.y, items: [item] });
    }
  }

  rows.sort((a, b) => b.centerY - a.centerY);
  return rows.map(r => r.items.sort((a, b) => a.x - b.x));
}

/**
 * Find the CONTROL POINT header row and extract column x-positions.
 * Supports both column-header format (NORTHING/EASTING headers) and
 * label-value format (N: 1234567.89 / E: 2345678.90 / ELEV: 123.45).
 */
function findHeaderColumns(rows: TextItem[][]): {
  headerRowIdx: number;
  cols: { pointId: number; northing: number; easting: number; elevation: number | null; description: number };
} | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const texts = row.map(item => item.str.toUpperCase());

    const hasControlPoint = texts.some(t =>
      t.includes('CONTROL') || t.includes('CONTROL POINTS') || t.includes('CONTROL PT')
    );
    const hasNorthing = texts.some(t => t.includes('NORTHING') || t.includes('N:'));
    const hasEasting = texts.some(t => t.includes('EASTING') || t.includes('E:'));

    if (hasControlPoint && hasNorthing && hasEasting) {
      const findX = (keyword: string) => {
        const item = row.find(it => it.str.toUpperCase().includes(keyword));
        return item ? item.x : null;
      };

      const pointIdX = findX('CONTROL') ?? findX('POINT') ?? row[0]?.x;
      const northingX = findX('NORTHING') ?? findX('N:');
      const eastingX = findX('EASTING') ?? findX('E:');
      const elevationX = findX('ELEVATION') ?? findX('ELEV') ?? findX('ELEV:');
      const descriptionX = findX('DESCRIPTION') ?? findX('DESC');

      if (pointIdX == null || northingX == null || eastingX == null) return null;

      return {
        headerRowIdx: i,
        cols: {
          pointId: pointIdX,
          northing: northingX,
          easting: eastingX,
          elevation: elevationX,
          description: descriptionX ?? eastingX + 200,
        },
      };
    }
  }
  return null;
}

function assignToColumn(
  x: number,
  cols: { pointId: number; northing: number; easting: number; elevation: number | null; description: number },
): 'pointId' | 'northing' | 'easting' | 'elevation' | 'description' | null {
  const candidates: Array<{ col: string; dist: number }> = [
    { col: 'pointId', dist: Math.abs(x - cols.pointId) },
    { col: 'northing', dist: Math.abs(x - cols.northing) },
    { col: 'easting', dist: Math.abs(x - cols.easting) },
    { col: 'description', dist: Math.abs(x - cols.description) },
  ];
  if (cols.elevation != null) {
    candidates.push({ col: 'elevation', dist: Math.abs(x - cols.elevation) });
  }

  candidates.sort((a, b) => a.dist - b.dist);
  if (candidates[0].dist > 80) return null;
  return candidates[0].col as any;
}

function parseControlPointTable(
  pageItems: TextItem[],
): { points: ControlPoint[]; warnings: string[]; tablesFound: number } {
  const warnings: string[] = [];
  const points: ControlPoint[] = [];

  const rows = groupIntoRows(pageItems);
  const headerInfo = findHeaderColumns(rows);

  if (!headerInfo) {
    return { points, warnings: ['No CONTROL POINT table with NORTHING/EASTING headers found.'], tablesFound: 0 };
  }

  const { headerRowIdx, cols } = headerInfo;

  for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
    const row = rows[ri];

    const cells: Record<string, string[]> = {
      pointId: [], northing: [], easting: [], elevation: [], description: [],
    };

    for (const item of row) {
      const col = assignToColumn(item.x, cols);
      if (col) cells[col].push(item.str);
    }

    const pointIdStr = cells.pointId.join(' ').trim();
    const northingStr = cells.northing.join('').trim();
    const eastingStr = cells.easting.join('').trim();
    const elevStr = cells.elevation.join('').trim();
    const descStr = cells.description.join(' ').trim();

    if (!pointIdStr || !/^\d{1,4}$/.test(pointIdStr)) continue;

    const northing = parseNum(northingStr);
    const easting = parseNum(eastingStr);

    if (northing === null || easting === null) continue;

    const validationError = validateCoordinates(northing, easting);
    if (validationError) {
      warnings.push(`Point ${pointIdStr}: ${validationError} — skipped.`);
      continue;
    }

    if (northing < easting) {
      warnings.push(`Point ${pointIdStr}: Northing (${northing}) < Easting (${easting}) — values may be swapped. Skipping.`);
      continue;
    }

    const elevation = elevStr ? parseNum(elevStr) : null;
    points.push({ pointId: pointIdStr, northing, easting, elevation, description: descStr });
  }

  return { points, warnings, tablesFound: points.length > 0 ? 1 : 0 };
}

/**
 * OCR fallback: convert PDF to image, crop multiple regions, use LLM vision to extract control points.
 * Scans for: CONTROL POINTS, XCUT, BENCHMARK, MONUMENT, N:, E:, NORTHING, EASTING, ELEV,
 *   TEXAS STATE PLANE, NAD-83, COORDINATE SYSTEM, SURVEY POINT, CONTROL PT
 */
async function extractViaOcr(
  pdfBuffer: Buffer,
  fileName: string,
): Promise<PdfParseResult> {
  const tmpId = randomUUID();
  const tmpPdf = join(tmpdir(), `${tmpId}.pdf`);
  const tmpImgBase = join(tmpdir(), `${tmpId}_page`);

  try {
    // Write PDF to temp file
    writeFileSync(tmpPdf, pdfBuffer);

    // Convert first page to PNG at 200 DPI
    execSync(`pdftoppm -r 200 -png -f 1 -l 1 "${tmpPdf}" "${tmpImgBase}"`, { timeout: 30000 });

    // Find the generated image
    const imgPath = `${tmpImgBase}-1.png`;
    if (!existsSync(imgPath)) {
      return {
        success: false,
        points: [],
        totalPages: 1,
        tablesFound: 0,
        warnings: [],
        error: 'PDF to image conversion failed. pdftoppm did not produce output.',
        method: 'ocr',
      };
    }

    // Load image with sharp to get dimensions and crop regions
    const sharp = (await import('sharp')).default;
    const imgMeta = await sharp(imgPath).metadata();
    const imgW = imgMeta.width ?? 0;
    const imgH = imgMeta.height ?? 0;

    // Crop regions to scan — prioritize bottom-left (most common location for control point tables)
    // but also scan bottom-right, full bottom strip, and full page as fallback
    const regions = [
      { name: 'bottom-left', left: 0, top: Math.floor(imgH * 0.65), width: Math.floor(imgW * 0.35), height: Math.floor(imgH * 0.35) },
      { name: 'bottom-right', left: Math.floor(imgW * 0.5), top: Math.floor(imgH * 0.65), width: Math.floor(imgW * 0.5), height: Math.floor(imgH * 0.35) },
      { name: 'bottom-strip', left: 0, top: Math.floor(imgH * 0.55), width: imgW, height: Math.floor(imgH * 0.45) },
      { name: 'full-page', left: 0, top: 0, width: imgW, height: imgH },
    ];

    const { invokeLLM } = await import('./_core/llm.js');
    const { storagePut } = await import('./storage.js');

    for (const region of regions) {
      // Crop region
      const cropPath = join(tmpdir(), `${tmpId}_crop_${region.name}.png`);
      await sharp(imgPath)
        .extract({ left: region.left, top: region.top, width: region.width, height: region.height })
        .png()
        .toFile(cropPath);

      // Upload to R2 for LLM access
      const cropBuffer = readFileSync(cropPath);
      const { url: imageUrl } = await storagePut(
        `ocr-tmp/${tmpId}-${region.name}.png`,
        cropBuffer,
        'image/png'
      );

      // Ask LLM to OCR the image for control points
      const prompt = `You are a precise OCR engine for engineering survey documents.

Examine this image and look for a "CONTROL POINTS" table or section. It may also be labeled as:
- CONTROL POINTS
- CONTROL PT
- SURVEY POINTS  
- BENCHMARK
- MONUMENT
- PROJECT CONTROL

The table typically contains entries with:
- A point number or ID (e.g., 1, 2, 3, or XCUT, MON-1, BM-1, etc.)
- N: or NORTHING value (a large number like 6966963.40)
- E: or EASTING value (a large number like 2592821.22)
- ELEV: or ELEVATION value (optional, a smaller number like 482.63)
- A coordinate system note (e.g., TEXAS STATE PLANE, NAD-83, NORTH CENTRAL ZONE)

If you find such a table, extract ALL points and return them as JSON in this exact format:
{
  "found": true,
  "coordinateSystem": "TEXAS STATE PLANE COORDINATE SYSTEM NAD-83 NORTH CENTRAL ZONE (4202)",
  "points": [
    { "pointId": "1", "description": "XCUT", "northing": 6966963.40, "easting": 2592821.22, "elevation": 482.63 },
    { "pointId": "2", "description": "XCUT", "northing": 6966827.58, "easting": 2593148.58, "elevation": 479.48 }
  ]
}

If no control points table is found in this image region, return:
{ "found": false }

Return ONLY valid JSON. No explanation, no markdown, no code blocks.`;

      let llmResponse: any;
      try {
        llmResponse = await invokeLLM({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
                { type: 'text', text: prompt },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        });
      } catch (llmErr) {
        continue; // Try next region
      }

      // Clean up temp crop
      try { unlinkSync(cropPath); } catch {}
      try {
        // Delete from R2 (best effort)
        const { storageDelete } = await import('./storage.js');
        await storageDelete(`ocr-tmp/${tmpId}-${region.name}.png`);
      } catch {}

      const content = llmResponse?.choices?.[0]?.message?.content;
      if (!content) continue;

      let parsed: any;
      try {
        parsed = typeof content === 'string' ? JSON.parse(content) : content;
      } catch {
        continue;
      }

      if (!parsed?.found || !Array.isArray(parsed?.points) || parsed.points.length === 0) {
        continue;
      }

      // Validate and convert extracted points
      const points: ControlPoint[] = [];
      const warnings: string[] = [];

      for (const pt of parsed.points) {
        const northing = typeof pt.northing === 'number' ? pt.northing : parseNum(String(pt.northing ?? ''));
        const easting = typeof pt.easting === 'number' ? pt.easting : parseNum(String(pt.easting ?? ''));
        const elevation = pt.elevation != null ? (typeof pt.elevation === 'number' ? pt.elevation : parseNum(String(pt.elevation))) : null;
        const pointId = String(pt.pointId ?? '').trim();
        const description = String(pt.description ?? '').trim();

        if (!pointId || northing === null || easting === null) {
          warnings.push(`Skipped incomplete point: ${JSON.stringify(pt)}`);
          continue;
        }

        const validationError = validateCoordinates(northing, easting);
        if (validationError) {
          warnings.push(`Point ${pointId}: ${validationError} — skipped.`);
          continue;
        }

        points.push({ pointId, northing, easting, elevation, description });
      }

      if (points.length > 0) {
        return {
          success: true,
          points,
          totalPages: 1,
          tablesFound: 1,
          warnings,
          method: 'ocr',
        };
      }
    }

    return {
      success: false,
      points: [],
      totalPages: 1,
      tablesFound: 0,
      warnings: [],
      error: 'No CONTROL POINTS table found via OCR. Ensure the PDF contains a labeled control points section with N/E/ELEV values.',
      method: 'ocr',
    };

  } finally {
    // Clean up temp files
    try { if (existsSync(tmpPdf)) unlinkSync(tmpPdf); } catch {}
    try {
      const imgPath = `${tmpImgBase}-1.png`;
      if (existsSync(imgPath)) unlinkSync(imgPath);
    } catch {}
  }
}

/**
 * Main entry point: parse a PDF buffer and extract all CONTROL POINT tables.
 * Tries text extraction first, falls back to OCR if text extraction yields no results.
 */
export async function parsePdfControlPoints(
  pdfBuffer: Buffer,
  fileName: string,
): Promise<PdfParseResult> {
  let allPageItems: TextItem[][];
  let totalPages = 1;

  // --- Strategy 1: Text extraction ---
  try {
    const result = await extractPdfItems(pdfBuffer);
    allPageItems = result.items;
    totalPages = result.pages;
  } catch (err) {
    // Text extraction failed entirely — go straight to OCR
    return extractViaOcr(pdfBuffer, fileName);
  }

  // Check if there's meaningful text at all
  const hasText = allPageItems.some(p => p.length > 0);

  if (hasText) {
    // Try each page
    let bestResult: { points: ControlPoint[]; warnings: string[]; tablesFound: number } = {
      points: [], warnings: [], tablesFound: 0,
    };

    for (const pageItems of allPageItems) {
      const result = parseControlPointTable(pageItems);
      if (result.points.length > bestResult.points.length) {
        bestResult = result;
      }
    }

    if (bestResult.points.length > 0) {
      return {
        success: true,
        points: bestResult.points,
        totalPages,
        tablesFound: bestResult.tablesFound,
        warnings: bestResult.warnings,
        method: 'text',
      };
    }
  }

  // --- Strategy 2: OCR fallback ---
  // Text extraction found no control points (either no text, or text present but no table)
  return extractViaOcr(pdfBuffer, fileName);
}
