/**
 * PDF Control Point Table Parser
 *
 * Extracts CONTROL POINT tables from survey/engineering PDFs.
 * Uses pdftotext (poppler-utils) with -layout flag for accurate column alignment.
 *
 * STRICT VALIDATION RULES:
 * - Column headers must be explicitly identified before any data is extracted.
 * - Elevation MUST NOT be confused with Northing or Easting.
 * - Northing and Easting values are range-validated for US State Plane Survey Feet.
 * - If column order is ambiguous, the parser fails gracefully with a descriptive error.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

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
}

// ── Column header patterns (normalized, lowercase, no spaces) ──────────────
const HEADER_PATTERNS = {
  pointId:     ['controlpoint', 'point', 'ptid', 'pt', 'id', 'no', 'number', 'marker', 'station'],
  northing:    ['northing', 'north'],
  easting:     ['easting', 'east'],
  elevation:   ['elevation', 'elev', 'elv', 'height'],
  description: ['description', 'desc', 'note', 'notes', 'type', 'monument'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Two-pass column matcher: exact first, then substring (patterns > 2 chars only).
 */
function matchColumnIndex(normalized: string, patterns: string[]): boolean {
  const normalizedPatterns = patterns.map(normalizeHeader);
  if (normalizedPatterns.includes(normalized)) return true;
  for (const p of normalizedPatterns) {
    if (p.length > 2 && normalized.includes(p)) return true;
  }
  return false;
}

interface ColumnMap {
  pointId: number;
  northing: number;
  easting: number;
  elevation: number | null;
  description: number | null;
}

function identifyColumns(headers: string[]): ColumnMap | null {
  const normalized = headers.map(normalizeHeader);

  const find = (patterns: string[]): number => {
    for (let i = 0; i < normalized.length; i++) {
      if (matchColumnIndex(normalized[i], patterns)) return i;
    }
    return -1;
  };

  const pointIdIdx   = find(HEADER_PATTERNS.pointId);
  const northingIdx  = find(HEADER_PATTERNS.northing);
  const eastingIdx   = find(HEADER_PATTERNS.easting);
  const elevationIdx = find(HEADER_PATTERNS.elevation);
  const descIdx      = find(HEADER_PATTERNS.description);

  if (pointIdIdx === -1 || northingIdx === -1 || eastingIdx === -1) return null;
  if (northingIdx === eastingIdx) return null;
  if (elevationIdx !== -1 && (elevationIdx === northingIdx || elevationIdx === eastingIdx)) return null;

  return {
    pointId:     pointIdIdx,
    northing:    northingIdx,
    easting:     eastingIdx,
    elevation:   elevationIdx === -1 ? null : elevationIdx,
    description: descIdx === -1 ? null : descIdx,
  };
}

function parseNum(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function validateCoordinates(northing: number, easting: number): string | null {
  if (northing < 0 || northing > 12_000_000) {
    return `Northing ${northing} is outside plausible US Survey Feet range (0–12,000,000)`;
  }
  if (easting < 100_000 || easting > 5_000_000) {
    return `Easting ${easting} is outside plausible US Survey Feet range (100,000–5,000,000)`;
  }
  return null;
}

/**
 * Parse CONTROL POINT tables from the raw text output of pdftotext -layout.
 * The -layout flag preserves column spacing, making it possible to split on whitespace.
 */
function parseControlPointTable(text: string): { points: ControlPoint[]; warnings: string[]; tablesFound: number } {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const points: ControlPoint[] = [];
  const warnings: string[] = [];
  let tablesFound = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalized = normalizeHeader(line);

    // Detect a header line: must contain both 'northing' and 'easting'
    if (!normalized.includes('northing') || !normalized.includes('easting')) continue;

    // Split header on 2+ spaces or tabs
    const headerTokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(t => t.length > 0);
    if (headerTokens.length < 3) continue;

    const colMap = identifyColumns(headerTokens);
    if (!colMap) {
      warnings.push(`Found potential header but could not map columns: "${line}"`);
      continue;
    }

    tablesFound++;
    const tablePoints: ControlPoint[] = [];

    let consecutiveSkips = 0;
    const MAX_SKIPS = 5; // allow up to 5 non-data lines between data rows (e.g. title block bleed-through)

    for (let j = i + 1; j < lines.length; j++) {
      const dataLine = lines[j];

      // Hard stop: another header or end of section
      if (!dataLine || dataLine.length < 5) { consecutiveSkips++; if (consecutiveSkips > MAX_SKIPS) break; continue; }
      if (normalizeHeader(dataLine).includes('northing') && normalizeHeader(dataLine).includes('easting')) break;

      const tokens = dataLine.split(/\s{2,}|\t/).map(t => t.trim()).filter(t => t.length > 0);

      // Need at least enough tokens to reach all required columns
      if (tokens.length <= Math.max(colMap.pointId, colMap.northing, colMap.easting)) {
        consecutiveSkips++;
        if (consecutiveSkips > MAX_SKIPS) break;
        continue;
      }

      // Try to extract data using the column map, with optional offset for rows
      // that have extra leading tokens (e.g. drawing callout labels like 'CP3').
      let resolvedTokens = tokens;
      let northing = parseNum(tokens[colMap.northing]);
      let easting  = parseNum(tokens[colMap.easting]);

      // If northing/easting are non-numeric or fail validation, try shifting by +1
      // to handle rows where an extra label token precedes the data columns.
      if ((northing === null || easting === null) ||
          validateCoordinates(northing!, easting!) !== null) {
        // Slice off the extra leading token so indices align with the column map
        const sliced = tokens.slice(1);
        const shiftedNorthing = parseNum(sliced[colMap.northing]);
        const shiftedEasting  = parseNum(sliced[colMap.easting]);
        if (shiftedNorthing !== null && shiftedEasting !== null &&
            validateCoordinates(shiftedNorthing, shiftedEasting) === null) {
          resolvedTokens = sliced;
          northing = shiftedNorthing;
          easting  = shiftedEasting;
        }
      }

      // Skip non-numeric rows (e.g. address lines bleeding through from title block)
      if (northing === null || easting === null) {
        consecutiveSkips++;
        if (consecutiveSkips > MAX_SKIPS) break;
        continue;
      }

      const validationError = validateCoordinates(northing, easting);
      if (validationError) {
        warnings.push(`Row "${dataLine}" skipped: ${validationError}`);
        consecutiveSkips++;
        if (consecutiveSkips > MAX_SKIPS) break;
        continue;
      }

      consecutiveSkips = 0; // reset on successful data row

      const elevation = colMap.elevation !== null && resolvedTokens[colMap.elevation]
        ? parseNum(resolvedTokens[colMap.elevation])
        : null;

      const description = colMap.description !== null && resolvedTokens[colMap.description]
        ? resolvedTokens[colMap.description]
        : '';

      const pointId = resolvedTokens[colMap.pointId] || String(tablePoints.length + 1);
      tablePoints.push({ pointId, northing, easting, elevation, description });
    }

    if (tablePoints.length > 0) {
      points.push(...tablePoints);
    } else {
      warnings.push(`Header detected at line ${i + 1} but no valid data rows found.`);
      tablesFound--;
    }
  }

  return { points, warnings, tablesFound };
}

/**
 * Extract text from a PDF buffer using pdftotext -layout.
 * Writes to a temp file, runs pdftotext, then cleans up.
 */
async function extractPdfText(pdfBuffer: Buffer): Promise<{ text: string; pages: number }> {
  const tmpId = randomBytes(8).toString('hex');
  const tmpPdf = join(tmpdir(), `mapit-pdf-${tmpId}.pdf`);
  const tmpTxt = join(tmpdir(), `mapit-pdf-${tmpId}.txt`);

  try {
    await writeFile(tmpPdf, pdfBuffer);
    await execFileAsync('pdftotext', ['-layout', tmpPdf, tmpTxt]);

    const { readFile } = await import('fs/promises');
    const text = await readFile(tmpTxt, 'utf-8');

    // Get page count via pdfinfo
    let pages = 1;
    try {
      const { stdout } = await execFileAsync('pdfinfo', [tmpPdf]);
      const match = stdout.match(/Pages:\s+(\d+)/);
      if (match) pages = parseInt(match[1], 10);
    } catch {
      // pdfinfo not critical
    }

    return { text, pages };
  } finally {
    await unlink(tmpPdf).catch(() => {});
    await unlink(tmpTxt).catch(() => {});
  }
}

/**
 * Main entry point: parse a PDF buffer and extract all CONTROL POINT tables.
 */
export async function parsePdfControlPoints(
  pdfBuffer: Buffer,
  _fileName: string,
): Promise<PdfParseResult> {
  let text: string;
  let totalPages = 1;

  try {
    const result = await extractPdfText(pdfBuffer);
    text = result.text;
    totalPages = result.pages;
  } catch (err) {
    return {
      success: false,
      points: [],
      totalPages: 0,
      tablesFound: 0,
      warnings: [],
      error: `PDF text extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}. Ensure the PDF contains digital text (not a scanned image).`,
    };
  }

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      points: [],
      totalPages,
      tablesFound: 0,
      warnings: [],
      error: 'PDF appears to be a scanned image (no digital text found). OCR is required for this file.',
    };
  }

  const { points, warnings, tablesFound } = parseControlPointTable(text);

  if (tablesFound === 0) {
    return {
      success: false,
      points: [],
      totalPages,
      tablesFound: 0,
      warnings,
      error: 'No CONTROL POINT table found in this PDF. Ensure the table has NORTHING and EASTING column headers.',
    };
  }

  return {
    success: true,
    points,
    totalPages,
    tablesFound,
    warnings,
  };
}
