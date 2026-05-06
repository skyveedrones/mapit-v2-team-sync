/**
 * Coordinate Converter tRPC Router
 * Handles State Plane Coordinate (SPCS) to WGS84 (GPS) conversions
 * Supports single and batch conversions with file uploads
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../_core/trpc';
import {
  convertCoordinate,
  convertCoordinateBatch,
  getAvailableCoordinateSystems,
  validateCoordinates,
  validateCSF,
  type CoordinateSystemKey,
} from '../coordinateConverter';

/**
 * Input validation schemas
 */
const CoordinateSystemKeySchema = z.enum(['TX_NORTH_CENTRAL', 'TX_SOUTH_CENTRAL', 'TX_NORTH']);

const SingleConversionInputSchema = z.object({
  easting: z.number().finite().describe('Easting coordinate in feet'),
  northing: z.number().finite().describe('Northing coordinate in feet'),
  systemKey: CoordinateSystemKeySchema.optional().default('TX_NORTH_CENTRAL'),
  combinedScaleFactor: z.number().positive().optional().default(1.0),
});

const BatchConversionInputSchema = z.object({
  coordinates: z.array(
    z.object({
      easting: z.number().finite(),
      northing: z.number().finite(),
    })
  ).min(1).max(1000),
  systemKey: CoordinateSystemKeySchema.optional().default('TX_NORTH_CENTRAL'),
  combinedScaleFactor: z.number().positive().optional().default(1.0),
});

/**
 * Coordinate Converter Router
 * Public procedures - no authentication required
 */
export const coordinateConverterRouter = router({
  /**
   * Get available coordinate systems
   */
  getAvailableSystems: publicProcedure.query(() => {
    try {
      return getAvailableCoordinateSystems();
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve available coordinate systems',
        cause: error,
      });
    }
  }),

  /**
   * Convert a single coordinate from SPCS to WGS84
   */
  convertSingle: publicProcedure
    .input(SingleConversionInputSchema)
    .mutation(({ input }) => {
      try {
        // Validate inputs
        const validation = validateCoordinates(input.easting, input.northing);
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid coordinates: ${validation.errors.join(', ')}`,
          });
        }

        const csfValidation = validateCSF(input.combinedScaleFactor);
        if (!csfValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: csfValidation.error || 'Invalid Combined Scale Factor',
          });
        }

        // Perform conversion
        const result = convertCoordinate(
          input.easting,
          input.northing,
          input.systemKey as CoordinateSystemKey,
          input.combinedScaleFactor
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Conversion failed',
          });
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Coordinate conversion failed',
          cause: error,
        });
      }
    }),

  /**
   * Convert multiple coordinates in batch
   */
  convertBatch: publicProcedure
    .input(BatchConversionInputSchema)
    .mutation(({ input }) => {
      try {
        // Validate batch size
        if (input.coordinates.length > 1000) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Batch size exceeds maximum of 1000 coordinates',
          });
        }

        // Validate CSF
        const csfValidation = validateCSF(input.combinedScaleFactor);
        if (!csfValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: csfValidation.error || 'Invalid Combined Scale Factor',
          });
        }

        // Perform batch conversion
        const result = convertCoordinateBatch(
          input.coordinates,
          input.systemKey as CoordinateSystemKey,
          input.combinedScaleFactor
        );

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Batch conversion failed',
          cause: error,
        });
      }
    }),

  /**
   * Validate coordinates without converting
   */
  validateCoordinates: publicProcedure
    .input(
      z.object({
        easting: z.number().finite(),
        northing: z.number().finite(),
      })
    )
    .query(({ input }) => {
      try {
        const validation = validateCoordinates(input.easting, input.northing);
        return {
          isValid: validation.isValid,
          errors: validation.errors,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Validation failed',
          cause: error,
        });
      }
    }),

  /**
   * Validate Combined Scale Factor
   */
  validateCSF: publicProcedure
    .input(z.object({ csf: z.number() }))
    .query(({ input }) => {
      try {
        const validation = validateCSF(input.csf);
        return {
          isValid: validation.isValid,
          error: validation.error,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CSF validation failed',
          cause: error,
        });
      }
    }),
});
