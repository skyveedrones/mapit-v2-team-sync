/**
 * PDF Control Point Table Parser
 *
 * Extracts CONTROL POINT tables from survey/engineering PDFs.
 *
 * Strategy 1 (fast): pdfjs-dist text extraction — uses keyword dataset from survey_ocr_patterns DB.
 * Strategy 2 (OCR fallback): Convert PDF to image via pdftoppm, crop regions, use LLM vision.
 *   After successful OCR, saves newly detected patterns back to the DB for future use.
 *
 * The survey_ocr_patterns table grows with each extraction, making future parsing faster.
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
  patternsLearned?: number;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

interface OcrPattern {
  category: string;
  pattern: string;
  aliases: string[];
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
 * Load approved patterns from the survey_ocr_patterns DB table.
 * Falls back to hardcoded defaults if DB is unavailable.
 */
async function loadPatterns(): Promise<OcrPattern[]> {
  try {
    const { getDb } = await import('./db.js');
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    const { surveyOcrPatterns } = await import('../drizzle/schema.js');
    const { eq } = await import('drizzle-orm');

    const rows = await db
      .select()
      .from(surveyOcrPatterns)
      .where(eq(surveyOcrPatterns.approved, 1));

    return rows.map((r: any) => ({
      category: r.category,
      pattern: r.pattern,
      aliases: r.aliases ? JSON.parse(r.aliases) : [],
    }));
  } catch {
    // Fallback defaults if DB unavailable
    return [
      { category: 'table_header', pattern: 'CONTROL POINTS', aliases: ['Control Points', 'CONTROL PT', 'CTRL PTS'] },
      { category: 'table_header', pattern: 'SURVEY POINTS', aliases: ['Survey Points', 'SURVEY PT'] },
      { category: 'table_header', pattern: 'BENCHMARKS', aliases: ['Benchmarks', 'BENCH MARKS'] },
      { category: 'table_header', pattern: 'HORIZONTAL CONTROL', aliases: ['Horizontal Control'] },
      { category: 'point_label', pattern: 'XCUT', aliases: ['X-CUT', 'X CUT'] },
      { category: 'point_label', pattern: 'BM', aliases: ['B.M.', 'BENCHMARK'] },
      { category: 'coord_label', pattern: 'NORTHING', aliases: ['N:', 'N ='] },
      { category: 'coord_label', pattern: 'EASTING', aliases: ['E:', 'E ='] },
      { category: 'elev_label', pattern: 'ELEVATION', aliases: ['ELEV', 'ELEV:'] },
      { category: 'coord_system', pattern: 'STATE PLANE', aliases: ['STATE PLANE COORDINATES', 'SPCS'] },
      { category: 'coord_system', pattern: 'NAD-83', aliases: ['NAD83', 'NAD 83'] },
    ];
  }
}

/**
 * Save newly discovered patterns to the DB (unapproved, pending review).
 * Increments hit_count if pattern already exists.
 */
async function saveNewPatterns(
  newPatterns: Array<{ category: string; pattern: string; sourceDocument: string }>,
): Promise<number> {
  if (newPatterns.length === 0) return 0;
  try {
    const { getDb } = await import('./db.js');
    const db = await getDb();
    if (!db) return 0;
    const { surveyOcrPatterns } = await import('../drizzle/schema.js');
    const { eq, and } = await import('drizzle-orm');

    let saved = 0;
    for (const np of newPatterns) {
      // Check if pattern already exists
      const existing = await db
        .select({ id: surveyOcrPatterns.id, hitCount: surveyOcrPatterns.hitCount })
        .from(surveyOcrPatterns)
        .where(
          and(
            eq(surveyOcrPatterns.category, np.category),
            eq(surveyOcrPatterns.pattern, np.pattern.toUpperCase()),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Increment hit count
        await db
          .update(surveyOcrPatterns)
          .set({ hitCount: (existing[0].hitCount ?? 0) + 1 })
          .where(eq(surveyOcrPatterns.id, existing[0].id));
      } else {
        // Insert as unapproved (pending review)
        await db.insert(surveyOcrPatterns).values({
          category: np.category,
          pattern: np.pattern.toUpperCase(),
          sourceDocument: np.sourceDocument,
          confidence: 60,
          approved: 0,
          hitCount: 1,
        });
        saved++;
      }
    }
    return saved;
  } catch {
    return 0;
  }
}

/**
 * Increment hit count for patterns that matched during text extraction.
 */
async function incrementPatternHits(matchedPatterns: string[]): Promise<void> {
  if (matchedPatterns.length === 0) return;
  try {
    const { getDb } = await import('./db.js');
    const db = await getDb();
    if (!db) return;
    const { surveyOcrPatterns } = await import('../drizzle/schema.js');
    const { eq, inArray } = await import('drizzle-orm');

    const rows = await db
      .select({ id: surveyOcrPatterns.id, hitCount: surveyOcrPatterns.hitCount })
      .from(surveyOcrPatterns)
      .where(inArray(surveyOcrPatterns.pattern, matchedPatterns));

    for (const row of rows) {
      await db
        .update(surveyOcrPatterns)
        .set({ hitCount: (row.hitCount ?? 0) + 1 })
        .where(eq(surveyOcrPatterns.id, row.id));
    }
  } catch {}
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
 * Find the CONTROL POINT header row using patterns from the DB dataset.
 */
function findHeaderColumns(
  rows: TextItem[][],
  patterns: OcrPattern[],
): {
  headerRowIdx: number;
  cols: { pointId: number; northing: number; easting: number; elevation: number | null; description: number };
  matchedPatterns: string[];
} | null {
  // Build search terms from patterns
  const headerTerms = patterns
    .filter(p => p.category === 'table_header')
    .flatMap(p => [p.pattern, ...p.aliases].map(s => s.toUpperCase()));

  const northingTerms = patterns
    .filter(p => p.category === 'coord_label' && (p.pattern.includes('NORTHING') || p.aliases.some(a => a.includes('N:'))))
    .flatMap(p => [p.pattern, ...p.aliases].map(s => s.toUpperCase()));

  const eastingTerms = patterns
    .filter(p => p.category === 'coord_label' && (p.pattern.includes('EASTING') || p.aliases.some(a => a.includes('E:'))))
    .flatMap(p => [p.pattern, ...p.aliases].map(s => s.toUpperCase()));

  const elevTerms = patterns
    .filter(p => p.category === 'elev_label')
    .flatMap(p => [p.pattern, ...p.aliases].map(s => s.toUpperCase()));

  // Fallback defaults if DB patterns don't cover these
  const allNorthing = Array.from(new Set([...northingTerms, 'NORTHING', 'N:', 'N =', 'NORTH']));
  const allEasting = Array.from(new Set([...eastingTerms, 'EASTING', 'E:', 'E =', 'EAST']));
  const allElev = Array.from(new Set([...elevTerms, 'ELEVATION', 'ELEV', 'ELEV:', 'HT', 'HEIGHT']));
  const allHeaders = Array.from(new Set([...headerTerms, 'CONTROL', 'CONTROL POINTS', 'SURVEY POINTS', 'BENCHMARKS', 'MONUMENTS']));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const texts = row.map(item => item.str.toUpperCase());
    const fullText = texts.join(' ');

    const hasHeader = allHeaders.some(h => fullText.includes(h));
    const hasNorthing = allNorthing.some(n => fullText.includes(n));
    const hasEasting = allEasting.some(e => fullText.includes(e));

    if (hasHeader && hasNorthing && hasEasting) {
      const matchedPatterns: string[] = [];

      const findX = (terms: string[]) => {
        for (const term of terms) {
          const item = row.find(it => it.str.toUpperCase().includes(term));
          if (item) {
            matchedPatterns.push(term);
            return item.x;
          }
        }
        return null;
      };

      const pointIdX = findX(allHeaders) ?? row[0]?.x;
      const northingX = findX(allNorthing);
      const eastingX = findX(allEasting);
      const elevationX = findX(allElev);
      const descriptionX = findX(['DESCRIPTION', 'DESC']);

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
        matchedPatterns,
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
  patterns: OcrPattern[],
): { points: ControlPoint[]; warnings: string[]; tablesFound: number; matchedPatterns: string[] } {
  const warnings: string[] = [];
  const points: ControlPoint[] = [];

  const rows = groupIntoRows(pageItems);
  const headerInfo = findHeaderColumns(rows, patterns);

  if (!headerInfo) {
    return { points, warnings: ['No CONTROL POINT table with NORTHING/EASTING headers found.'], tablesFound: 0, matchedPatterns: [] };
  }

  const { headerRowIdx, cols, matchedPatterns } = headerInfo;

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

  return { points, warnings, tablesFound: points.length > 0 ? 1 : 0, matchedPatterns };
}

/**
 * OCR fallback: convert PDF to image, crop multiple regions, use LLM vision to extract control points.
 * After successful extraction, saves newly detected patterns to the DB.
 */
async function extractViaOcr(
  pdfBuffer: Buffer,
  fileName: string,
  patterns: OcrPattern[],
): Promise<PdfParseResult> {
  const tmpId = randomUUID();
  const tmpPdf = join(tmpdir(), `${tmpId}.pdf`);
  const tmpImgBase = join(tmpdir(), `${tmpId}_page`);

  try {
    writeFileSync(tmpPdf, pdfBuffer);
    execSync(`pdftoppm -r 200 -png -f 1 -l 1 "${tmpPdf}" "${tmpImgBase}"`, { timeout: 30000 });

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

    const sharp = (await import('sharp')).default;
    const imgMeta = await sharp(imgPath).metadata();
    const imgW = imgMeta.width ?? 0;
    const imgH = imgMeta.height ?? 0;

    const regions = [
      { name: 'bottom-left', left: 0, top: Math.floor(imgH * 0.65), width: Math.floor(imgW * 0.35), height: Math.floor(imgH * 0.35) },
      { name: 'bottom-right', left: Math.floor(imgW * 0.5), top: Math.floor(imgH * 0.65), width: Math.floor(imgW * 0.5), height: Math.floor(imgH * 0.35) },
      { name: 'bottom-strip', left: 0, top: Math.floor(imgH * 0.55), width: imgW, height: Math.floor(imgH * 0.45) },
      { name: 'full-page', left: 0, top: 0, width: imgW, height: imgH },
    ];

    const { invokeLLM } = await import('./_core/llm.js');
    const { storagePut } = await import('./storage.js');

    // Build keyword list from DB patterns for the LLM prompt
    const tableHeaderKeywords = patterns
      .filter(p => p.category === 'table_header')
      .map(p => p.pattern)
      .slice(0, 15)
      .join(', ');

    const pointLabelKeywords = patterns
      .filter(p => p.category === 'point_label')
      .map(p => p.pattern)
      .slice(0, 15)
      .join(', ');

    const coordSystemKeywords = patterns
      .filter(p => p.category === 'coord_system')
      .map(p => p.pattern)
      .slice(0, 10)
      .join(', ');

    for (const region of regions) {
      const cropPath = join(tmpdir(), `${tmpId}_crop_${region.name}.png`);
      await sharp(imgPath)
        .extract({ left: region.left, top: region.top, width: region.width, height: region.height })
        .png()
        .toFile(cropPath);

      const cropBuffer = readFileSync(cropPath);
      const { url: imageUrl } = await storagePut(
        `ocr-tmp/${tmpId}-${region.name}.png`,
        cropBuffer,
        'image/png'
      );

      const prompt = `You are a precise OCR engine for engineering survey documents.

Examine this image and look for a survey control point table. It may be labeled with any of these terms:
TABLE HEADERS: ${tableHeaderKeywords}
POINT LABELS: ${pointLabelKeywords}
COORDINATE SYSTEMS: ${coordSystemKeywords}

The table typically contains entries with:
- A point number or ID (numeric like 1, 2, 3 OR labeled like XCUT, MON-1, BM-1, GCP-1, etc.)
- N: or NORTHING value (a large number like 6966963.40)
- E: or EASTING value (a large number like 2592821.22)
- ELEV: or ELEVATION value (optional, a smaller number like 482.63)
- A coordinate system note (e.g., TEXAS STATE PLANE, NAD-83, WGS84, UTM)

ALSO: Report any NEW keywords you find that identify the table or coordinate system that are NOT in the lists above.

Return JSON in this exact format:
{
  "found": true,
  "coordinateSystem": "TEXAS STATE PLANE COORDINATE SYSTEM NAD-83 NORTH CENTRAL ZONE (4202)",
  "tableHeaderFound": "CONTROL POINTS",
  "newKeywordsFound": ["PROJECT DATUM", "GRID COORDINATES"],
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
        continue;
      }

      try { unlinkSync(cropPath); } catch {}
      try {
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
        // Save new keywords discovered by the LLM back to the DB
        let patternsLearned = 0;
        const newKeywords: Array<{ category: string; pattern: string; sourceDocument: string }> = [];

        if (parsed.tableHeaderFound && typeof parsed.tableHeaderFound === 'string') {
          newKeywords.push({ category: 'table_header', pattern: parsed.tableHeaderFound, sourceDocument: fileName });
        }
        if (Array.isArray(parsed.newKeywordsFound)) {
          for (const kw of parsed.newKeywordsFound) {
            if (typeof kw === 'string' && kw.trim().length > 2) {
              newKeywords.push({ category: 'table_header', pattern: kw.trim(), sourceDocument: fileName });
            }
          }
        }
        if (parsed.coordinateSystem && typeof parsed.coordinateSystem === 'string') {
          newKeywords.push({ category: 'coord_system', pattern: parsed.coordinateSystem.substring(0, 100), sourceDocument: fileName });
        }

        patternsLearned = await saveNewPatterns(newKeywords);

        return {
          success: true,
          points,
          totalPages: 1,
          tablesFound: 1,
          warnings,
          method: 'ocr',
          patternsLearned,
        };
      }
    }

    return {
      success: false,
      points: [],
      totalPages: 1,
      tablesFound: 0,
      warnings: [],
      error: 'No CONTROL POINTS table found via OCR. Ensure the PDF contains a visible survey control point table.',
      method: 'ocr',
    };

  } finally {
    try { if (existsSync(tmpPdf)) unlinkSync(tmpPdf); } catch {}
    try {
      const imgPath = `${tmpImgBase}-1.png`;
      if (existsSync(imgPath)) unlinkSync(imgPath);
    } catch {}
  }
}

/**
 * Main entry point: parse a PDF buffer and extract all CONTROL POINT tables.
 * Tries text extraction first (using DB patterns), falls back to OCR if needed.
 */
export async function parsePdfControlPoints(
  pdfBuffer: Buffer,
  fileName: string,
): Promise<PdfParseResult> {
  // Load patterns from DB (or fallback defaults)
  const patterns = await loadPatterns();

  let allPageItems: TextItem[][];
  let totalPages = 1;

  // --- Strategy 1: Text extraction with DB patterns ---
  try {
    const result = await extractPdfItems(pdfBuffer);
    allPageItems = result.items;
    totalPages = result.pages;
  } catch (err) {
    return extractViaOcr(pdfBuffer, fileName, patterns);
  }

  const hasText = allPageItems.some(p => p.length > 0);

  if (hasText) {
    let bestResult: { points: ControlPoint[]; warnings: string[]; tablesFound: number; matchedPatterns: string[] } = {
      points: [], warnings: [], tablesFound: 0, matchedPatterns: [],
    };

    for (const pageItems of allPageItems) {
      const result = parseControlPointTable(pageItems, patterns);
      if (result.points.length > bestResult.points.length) {
        bestResult = result;
      }
    }

    if (bestResult.points.length > 0) {
      // Increment hit counts for matched patterns
      await incrementPatternHits(bestResult.matchedPatterns);

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
  return extractViaOcr(pdfBuffer, fileName, patterns);
}
