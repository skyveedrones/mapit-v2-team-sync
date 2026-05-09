/**
 * Coordinate Converter File Upload Router
 * Handles CSV and Excel file uploads for batch coordinate conversion,
 * and PDF control point table extraction.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../_core/trpc';
import { parseCoordinateFile, validateParsedFile } from '../fileParser';
import { convertCoordinateBatch, type CoordinateSystemKey } from '../coordinateConverter';
import { parsePdfControlPoints } from '../pdfControlPointParser';

/**
 * File upload input schema
 */
const FileUploadInputSchema = z.object({
  fileName: z.string().min(1),
  fileBuffer: z.union([
    z.instanceof(Buffer),
    z.instanceof(Uint8Array),
    z.array(z.number()).transform(arr => Buffer.from(arr)),
  ]),
  systemKey: z.enum(['TX_NORTH_CENTRAL', 'TX_SOUTH_CENTRAL', 'TX_NORTH']).optional().default('TX_NORTH_CENTRAL'),
  combinedScaleFactor: z.number().positive().optional().default(1.0),
});

/**
 * Coordinate Converter Upload Router
 */
export const coordinateConverterUploadRouter = router({
  /**
   * Parse and convert coordinates from uploaded CSV/Excel file
   */
  parseAndConvert: publicProcedure
    .input(FileUploadInputSchema)
    .mutation(async ({ input }) => {
      try {
        // Parse file
        const parseResult = await parseCoordinateFile(input.fileBuffer, input.fileName);

        // Validate parsed file
        const validation = validateParsedFile(parseResult);
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.errors.join('; '),
          });
        }

        // Convert coordinates
        const conversionResult = convertCoordinateBatch(
          parseResult.rows.map((row) => ({
            easting: row.easting,
            northing: row.northing,
          })),
          input.systemKey as CoordinateSystemKey,
          input.combinedScaleFactor
        );

        // Enrich results with identifiers
        const enrichedResults = conversionResult.results.map((result, index) => ({
          ...result,
          identifier: parseResult.rows[index]?.identifier,
        }));

        return {
          success: true,
          totalRows: conversionResult.totalRows,
          successfulRows: conversionResult.successfulRows,
          failedRows: conversionResult.failedRows,
          results: enrichedResults,
          errors: conversionResult.errors,
          warnings: parseResult.warnings,
          columnMapping: parseResult.columnMapping,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'File processing failed',
          cause: error,
        });
      }
    }),

  /**
   * Parse a PDF and extract CONTROL POINT table, then convert to GPS coordinates.
   * Returns a review list of points for user confirmation before mapping.
   */
  parsePDF: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileBuffer: z.union([
          z.instanceof(Buffer),
          z.instanceof(Uint8Array),
          z.array(z.number()).transform(arr => Buffer.from(arr)),
        ]),
        systemKey: z.enum(['TX_NORTH_CENTRAL', 'TX_SOUTH_CENTRAL', 'TX_NORTH']).optional().default('TX_NORTH_CENTRAL'),
        combinedScaleFactor: z.number().positive().optional().default(1.0),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Step 1: Extract control points from PDF
        const pdfResult = await parsePdfControlPoints(input.fileBuffer as Buffer, input.fileName);

        if (!pdfResult.success || pdfResult.points.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: pdfResult.error || 'No control points found in PDF.',
          });
        }

        // Step 2: Convert northing/easting to GPS lat/lng
        const conversionResult = convertCoordinateBatch(
          pdfResult.points.map((pt) => ({ easting: pt.easting, northing: pt.northing })),
          input.systemKey as CoordinateSystemKey,
          input.combinedScaleFactor
        );

        // Step 3: Merge conversion results with PDF metadata
        const reviewPoints = pdfResult.points.map((pt, i) => {
          const conv = conversionResult.results[i];
          return {
            pointId: pt.pointId,
            northing: pt.northing,
            easting: pt.easting,
            elevation: pt.elevation,
            description: pt.description,
            latitude: conv?.success ? conv.latitude : null,
            longitude: conv?.success ? conv.longitude : null,
            conversionSuccess: conv?.success ?? false,
            conversionError: conv?.error ?? null,
          };
        });

        const successCount = reviewPoints.filter(p => p.conversionSuccess).length;

        return {
          success: true,
          totalPages: pdfResult.totalPages,
          tablesFound: pdfResult.tablesFound,
          totalPoints: pdfResult.points.length,
          successfulPoints: successCount,
          failedPoints: pdfResult.points.length - successCount,
          reviewPoints,
          warnings: pdfResult.warnings,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'PDF processing failed',
          cause: error,
        });
      }
    }),

  /**
   * Parse file without converting (preview mode)
   */
  parseOnly: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileBuffer: z.instanceof(Buffer),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const parseResult = await parseCoordinateFile(input.fileBuffer, input.fileName);

        if (!parseResult.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: parseResult.error || 'File parsing failed',
          });
        }

        return {
          success: true,
          rowCount: parseResult.rows.length,
          columnMapping: parseResult.columnMapping,
          sampleRows: parseResult.rows.slice(0, 5),
          warnings: parseResult.warnings,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'File preview failed',
          cause: error,
        });
      }
    }),
});
