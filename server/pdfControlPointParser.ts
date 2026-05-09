/**
 * PDF Control Point Table Parser
 *
 * Extracts CONTROL POINT tables from survey/engineering PDFs.
 * Uses pdfjs-dist (pure Node.js, no system binaries required).
 *
 * STRICT VALIDATION RULES:
 * - Column headers must be explicitly identified before any data is extracted.
 * - Elevation MUST NOT be confused with Northing or Easting.
 * - Northing and Easting values are range-validated for US State Plane Survey Feet.
 * - If column order is ambiguous, the parser fails gracefully with a descriptive error.
 */

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
 * Extract text from a PDF buffer using pdfjs-dist (pure Node.js).
 * pdfjs returns individual text runs joined with spaces per page.
 */
async function extractPdfText(pdfBuffer: Buffer): Promise<{ text: string; pages: number }> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string) as any;
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  let allText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    allText += pageText + '\n';
  }

  return { text: allText, pages: doc.numPages };
}

/**
 * Parse CONTROL POINT table from pdfjs text output.
 *
 * pdfjs produces a flat space-separated string per page, e.g.:
 * "CONTROL POINT   NORTHING   EASTING   ELEVATION   DESCRIPTION 1   6,966,282.50   2,589,191.79   411.43   XCUT/INLET  2 ..."
 *
 * Strategy: find the header, then tokenize the data section by splitting on 2+ spaces,
 * and group tokens into rows of (id, northing, easting, elevation, description).
 */
function parseControlPointTable(text: string): { points: ControlPoint[]; warnings: string[]; tablesFound: number } {
  const warnings: string[] = [];
  const points: ControlPoint[] = [];

  // Find the CONTROL POINT header with NORTHING and EASTING
  const headerIdx = text.search(/CONTROL\s+POINT\s+NORTHING\s+EASTING/i);
  if (headerIdx < 0) {
    return { points, warnings: ['No CONTROL POINT table with NORTHING/EASTING headers found.'], tablesFound: 0 };
  }

  const hasElevation = /ELEVATION/i.test(text.substring(headerIdx, headerIdx + 200));

  // Extract text after the header
  const afterHeader = text.substring(headerIdx);
  // Skip past the header tokens to the first digit (start of data)
  const dataStartMatch = afterHeader.match(/\d/);
  if (!dataStartMatch || dataStartMatch.index === undefined) {
    return { points, warnings: ['Header found but no data rows detected.'], tablesFound: 0 };
  }
  const dataText = afterHeader.substring(dataStartMatch.index);

  // Tokenize by splitting on 2+ spaces
  const normalized = dataText.replace(/\s{2,}/g, '|').trim();
  const tokens = normalized.split('|').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

  // Column count: id(1) + northing(1) + easting(1) + elevation(0|1) + description(1)
  const colCount = hasElevation ? 5 : 4;

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Determine if this token is a point ID (1-4 digit integer)
    let pointId: string | null = null;
    let offset = 0;

    if (/^\d{1,4}$/.test(token)) {
      pointId = token;
      offset = 1;
    } else if (/^[A-Za-z]+\d+$/.test(token)) {
      // Label like "CP3" — skip and use next token as point ID
      const next = tokens[i + 1];
      if (next && /^\d{1,4}$/.test(next)) {
        pointId = next;
        offset = 2;
      } else {
        i++;
        continue;
      }
    } else {
      i++;
      continue;
    }

    const northingToken = tokens[i + offset];
    const eastingToken  = tokens[i + offset + 1];
    const elevToken     = hasElevation ? tokens[i + offset + 2] : null;
    const descToken     = tokens[i + offset + (hasElevation ? 3 : 2)];

    if (!northingToken || !eastingToken) { i++; continue; }

    const northing = parseNum(northingToken);
    const easting  = parseNum(eastingToken);

    if (northing === null || easting === null) { i++; continue; }

    const validationError = validateCoordinates(northing, easting);
    if (validationError) {
      warnings.push(`Point ${pointId}: ${validationError} — skipped.`);
      i += offset + colCount;
      continue;
    }

    // Sanity: northing should be > easting for TX State Plane (northing ~6.9M, easting ~2.5M)
    if (northing < easting) {
      warnings.push(`Point ${pointId}: Northing (${northing}) < Easting (${easting}) — values may be swapped. Skipping.`);
      i += offset + colCount;
      continue;
    }

    const elevation   = elevToken ? parseNum(elevToken) : null;
    const description = descToken || '';

    points.push({ pointId, northing, easting, elevation, description });
    i += offset + colCount;
  }

  return { points, warnings, tablesFound: points.length > 0 ? 1 : 0 };
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
