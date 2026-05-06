/**
 * File Parser Service
 * Handles CSV and Excel file parsing for coordinate batch uploads
 * Automatically detects coordinate column headers
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parsed coordinate row
 */
export interface ParsedCoordinateRow {
  easting: number;
  northing: number;
  identifier?: string;
  rawRow: Record<string, any>;
}

/**
 * File parsing result
 */
export interface ParseFileResult {
  success: boolean;
  rows: ParsedCoordinateRow[];
  columnMapping: {
    eastingColumn: string;
    northingColumn: string;
    identifierColumn?: string;
  };
  warnings: string[];
  error?: string;
}

/**
 * Common header patterns for coordinate columns
 */
const HEADER_PATTERNS = {
  easting: [
    'easting',
    'east',
    'e',
    'x',
    'longitude',
    'lon',
    'long',
    'x_coord',
    'x-coord',
    'easting_ft',
    'easting_feet',
  ],
  northing: [
    'northing',
    'north',
    'n',
    'y',
    'latitude',
    'lat',
    'y_coord',
    'y-coord',
    'northing_ft',
    'northing_feet',
  ],
  identifier: [
    'id',
    'identifier',
    'point_id',
    'pointid',
    'point',
    'name',
    'label',
    'description',
    'desc',
  ],
};

/**
 * Normalize header name for matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]/g, '')
    .replace(/[()]/g, '');
}

/**
 * Find matching column header
 */
function findMatchingColumn(
  headers: string[],
  patterns: string[]
): { column: string; index: number } | null {
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const pattern of patterns) {
      if (normalized === normalizeHeader(pattern) || normalized.includes(normalizeHeader(pattern))) {
        return { column: header, index: headers.indexOf(header) };
      }
    }
  }
  return null;
}

/**
 * Parse CSV file content
 */
function parseCSV(content: string): Promise<{
  headers: string[];
  rows: Record<string, any>[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
        } else {
          const headers = (results.meta.fields as string[]) || [];
          resolve({
            headers,
            rows: results.data as Record<string, any>[],
          });
        }
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Excel file content
 */
function parseExcel(buffer: Buffer): {
  headers: string[];
  rows: Record<string, any>[];
} {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new Error('No sheets found in Excel file');
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

    if (jsonData.length === 0) {
      throw new Error('No data found in Excel sheet');
    }

    const headers = Object.keys(jsonData[0] as Record<string, any>);
    return {
      headers,
      rows: jsonData as Record<string, any>[],
    };
  } catch (error) {
    throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect actual file type based on extension (handles double extensions like .csv.xlsx)
 */
function detectFileType(fileName: string): 'csv' | 'excel' | 'unknown' {
  const lowerName = fileName.toLowerCase();
  
  // Check for .xlsx or .xls first (most specific)
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return 'excel';
  }
  
  // Check for .csv (handles .csv.xlsx by checking if it's actually an xlsx that was named with .csv)
  if (lowerName.endsWith('.csv')) {
    // If it ends with .csv but also has .xlsx before it, it's likely an Excel file
    if (lowerName.includes('.csv.xlsx') || lowerName.includes('.csv.xls')) {
      return 'excel';
    }
    return 'csv';
  }
  
  return 'unknown';
}

/**
 * Parse coordinate file (CSV or Excel)
 * Automatically detects column headers and extracts coordinates
 */
export async function parseCoordinateFile(
  fileBuffer: Buffer | Uint8Array,
  fileName: string
): Promise<ParseFileResult> {
  try {
    // Convert Uint8Array to Buffer if needed
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    
    // Validate file size (5MB limit)
    const fileSizeMB = buffer.length / (1024 * 1024);
    if (fileSizeMB > 5) {
      return {
        success: false,
        rows: [],
        columnMapping: {
          eastingColumn: '',
          northingColumn: '',
        },
        warnings: [],
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum limit of 5MB`,
      };
    }

    let headers: string[] = [];
    let rows: Record<string, any>[] = [];

    // Determine file type and parse accordingly
    const fileType = detectFileType(fileName);
    
    if (fileType === 'csv') {
      const content = buffer.toString('utf-8');
      const parsed = await parseCSV(content);
      headers = parsed.headers;
      rows = parsed.rows;
    } else if (fileType === 'excel') {
      const parsed = parseExcel(buffer);
      headers = parsed.headers;
      rows = parsed.rows;
    } else {
      return {
        success: false,
        rows: [],
        columnMapping: {
          eastingColumn: '',
          northingColumn: '',
        },
        warnings: [],
        error: 'Unsupported file format. Please upload a CSV or Excel file.',
      };
    }

    // Validate headers exist
    if (headers.length === 0) {
      return {
        success: false,
        rows: [],
        columnMapping: {
          eastingColumn: '',
          northingColumn: '',
        },
        warnings: [],
        error: 'File contains no headers or data',
      };
    }

    // Find coordinate columns
    const eastingMatch = findMatchingColumn(headers, HEADER_PATTERNS.easting);
    const northingMatch = findMatchingColumn(headers, HEADER_PATTERNS.northing);
    const identifierMatch = findMatchingColumn(headers, HEADER_PATTERNS.identifier);

    if (!eastingMatch || !northingMatch) {
      const missingColumns = [];
      if (!eastingMatch) missingColumns.push('Easting');
      if (!northingMatch) missingColumns.push('Northing');
      
      return {
        success: false,
        rows: [],
        columnMapping: {
          eastingColumn: '',
          northingColumn: '',
        },
        warnings: [],
        error: `Could not find ${missingColumns.join('/')} headers. Please check your file. Found columns: ${headers.join(', ')}`,
      };
    }

    // Validate row count (1000 limit)
    if (rows.length > 1000) {
      return {
        success: false,
        rows: [],
        columnMapping: {
          eastingColumn: eastingMatch.column,
          northingColumn: northingMatch.column,
          identifierColumn: identifierMatch?.column,
        },
        warnings: [],
        error: `File contains ${rows.length} rows, which exceeds the maximum limit of 1,000 rows`,
      };
    }

    // Parse coordinates
    const parsedRows: ParsedCoordinateRow[] = [];
    const warnings: string[] = [];
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const eastingValue = row[eastingMatch.column];
      const northingValue = row[northingMatch.column];
      const identifierValue = identifierMatch ? row[identifierMatch.column] : undefined;

      // Validate coordinate values
      const easting = parseFloat(String(eastingValue).trim());
      const northing = parseFloat(String(northingValue).trim());

      if (isNaN(easting) || isNaN(northing)) {
        skippedCount++;
        warnings.push(`Row ${i + 2}: Skipped due to invalid coordinate values`);
        continue;
      }

      parsedRows.push({
        easting,
        northing,
        identifier: identifierValue ? String(identifierValue).trim() : undefined,
        rawRow: row,
      });
    }

    // Check if we have any valid rows
    if (parsedRows.length === 0) {
      return {
        success: false,
        rows: [],
        columnMapping: {
          eastingColumn: eastingMatch.column,
          northingColumn: northingMatch.column,
          identifierColumn: identifierMatch?.column,
        },
        warnings,
        error: 'No valid coordinate rows found in file',
      };
    }

    return {
      success: true,
      rows: parsedRows,
      columnMapping: {
        eastingColumn: eastingMatch.column,
        northingColumn: northingMatch.column,
        identifierColumn: identifierMatch?.column,
      },
      warnings: skippedCount > 0 ? [...warnings, `Total: ${skippedCount} rows skipped due to errors`] : [],
    };
  } catch (error) {
    return {
      success: false,
      rows: [],
      columnMapping: {
        eastingColumn: '',
        northingColumn: '',
      },
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Validate parsed file before conversion
 */
export function validateParsedFile(result: ParseFileResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [...result.warnings];

  if (!result.success) {
    errors.push(result.error || 'File parsing failed');
  }

  if (result.rows.length === 0) {
    errors.push('No valid coordinate rows found');
  }

  if (result.rows.length > 1000) {
    errors.push('Row count exceeds maximum of 1,000');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
