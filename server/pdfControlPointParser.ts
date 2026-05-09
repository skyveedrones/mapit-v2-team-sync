/**
 * PDF Control Point Table Parser
 *
 * Extracts CONTROL POINT tables from survey/engineering PDFs.
 * Uses pdfjs-dist (pure Node.js, no system binaries required).
 *
 * STRICT VALIDATION RULES:
 * - Column headers are located by their x-position in the PDF coordinate space.
 * - Each data cell is assigned to a column by proximity to the header x-position.
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
 * Returns rows sorted top-to-bottom (descending y in PDF space).
 */
function groupIntoRows(items: TextItem[], yTolerance = 4): TextItem[][] {
  const rows: { centerY: number; items: TextItem[] }[] = [];

  for (const item of items) {
    const existing = rows.find(r => Math.abs(r.centerY - item.y) <= yTolerance);
    if (existing) {
      existing.items.push(item);
      // Update center y as average
      existing.centerY = existing.items.reduce((s, i) => s + i.y, 0) / existing.items.length;
    } else {
      rows.push({ centerY: item.y, items: [item] });
    }
  }

  // Sort rows top-to-bottom (higher y = higher on page in PDF space)
  rows.sort((a, b) => b.centerY - a.centerY);
  return rows.map(r => r.items.sort((a, b) => a.x - b.x));
}

/**
 * Find the CONTROL POINT header row and extract column x-positions.
 */
function findHeaderColumns(rows: TextItem[][]): {
  headerRowIdx: number;
  cols: { pointId: number; northing: number; easting: number; elevation: number | null; description: number };
} | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const texts = row.map(item => item.str.toUpperCase());

    const hasControlPoint = texts.some(t => t.includes('CONTROL') || t.includes('POINT'));
    const hasNorthing = texts.some(t => t.includes('NORTHING'));
    const hasEasting = texts.some(t => t.includes('EASTING'));

    if (hasControlPoint && hasNorthing && hasEasting) {
      // Find x positions of each column header
      const findX = (keyword: string) => {
        const item = row.find(it => it.str.toUpperCase().includes(keyword));
        return item ? item.x : null;
      };

      const pointIdX = findX('CONTROL') ?? findX('POINT') ?? row[0]?.x;
      const northingX = findX('NORTHING');
      const eastingX = findX('EASTING');
      const elevationX = findX('ELEVATION') ?? findX('ELEV');
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

/**
 * Assign a text item to the nearest column based on x-position.
 */
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
  // Only assign if within 80 units of a column center
  if (candidates[0].dist > 80) return null;
  return candidates[0].col as any;
}

/**
 * Parse CONTROL POINT table from pdfjs items using column-based extraction.
 */
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

  // Process data rows after the header
  for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
    const row = rows[ri];

    // Build a cell map for this row
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

    // Point ID must be a short integer or alphanumeric code
    if (!pointIdStr || !/^\d{1,4}$/.test(pointIdStr)) continue;

    const northing = parseNum(northingStr);
    const easting = parseNum(eastingStr);

    if (northing === null || easting === null) continue;

    const validationError = validateCoordinates(northing, easting);
    if (validationError) {
      warnings.push(`Point ${pointIdStr}: ${validationError} — skipped.`);
      continue;
    }

    // Sanity: northing should be > easting for TX State Plane
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
 * Main entry point: parse a PDF buffer and extract all CONTROL POINT tables.
 */
export async function parsePdfControlPoints(
  pdfBuffer: Buffer,
  _fileName: string,
): Promise<PdfParseResult> {
  let allPageItems: TextItem[][];
  let totalPages = 1;

  try {
    const result = await extractPdfItems(pdfBuffer);
    allPageItems = result.items;
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

  if (allPageItems.every(p => p.length === 0)) {
    return {
      success: false,
      points: [],
      totalPages,
      tablesFound: 0,
      warnings: [],
      error: 'PDF appears to be a scanned image (no digital text found). OCR is required for this file.',
    };
  }

  // Try each page until we find a table
  let bestResult: { points: ControlPoint[]; warnings: string[]; tablesFound: number } = {
    points: [], warnings: [], tablesFound: 0,
  };

  for (const pageItems of allPageItems) {
    const result = parseControlPointTable(pageItems);
    if (result.points.length > bestResult.points.length) {
      bestResult = result;
    }
  }

  if (bestResult.tablesFound === 0) {
    return {
      success: false,
      points: [],
      totalPages,
      tablesFound: 0,
      warnings: bestResult.warnings,
      error: 'No CONTROL POINT table found in this PDF. Ensure the table has NORTHING and EASTING column headers.',
    };
  }

  return {
    success: true,
    points: bestResult.points,
    totalPages,
    tablesFound: bestResult.tablesFound,
    warnings: bestResult.warnings,
  };
}
