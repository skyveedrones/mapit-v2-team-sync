/**
 * Unit tests for Coordinate Converter Service
 * Tests SPCS to WGS84 conversions with various inputs and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  convertCoordinate,
  convertCoordinateBatch,
  validateCoordinates,
  validateCSF,
  getAvailableCoordinateSystems,
  getCoordinateSystem,
  COORDINATE_SYSTEMS,
} from './coordinateConverter';

describe('Coordinate Converter Service', () => {
  describe('convertCoordinate', () => {
    it('should convert Texas North Central coordinates to GPS', () => {
      // Example: Austin, TX area coordinates in SPCS (EPSG:2276)
      // These are approximate test values
      const result = convertCoordinate(
        2000000, // easting in feet
        500000,  // northing in feet
        'TX_NORTH_CENTRAL',
        1.0
      );

      expect(result.success).toBe(true);
      expect(result.latitude).toBeDefined();
      expect(result.longitude).toBeDefined();
      // Verify coordinates are in valid GPS range
      expect(result.latitude).toBeGreaterThan(-90);
      expect(result.latitude).toBeLessThan(90);
      expect(result.longitude).toBeGreaterThan(-180);
      expect(result.longitude).toBeLessThan(180);
    });

    it('should apply Combined Scale Factor correctly', () => {
      const baseResult = convertCoordinate(
        2000000,
        500000,
        'TX_NORTH_CENTRAL',
        1.0
      );

      // With CSF < 1.0, coordinates are scaled up (divided by smaller number)
      const scaledResult = convertCoordinate(
        2000000,
        500000,
        'TX_NORTH_CENTRAL',
        0.99999
      );

      expect(baseResult.success).toBe(true);
      expect(scaledResult.success).toBe(true);
      // Results should be slightly different due to CSF
      expect(baseResult.latitude).not.toEqual(scaledResult.latitude);
    });

    it('should handle invalid easting', () => {
      const result = convertCoordinate(
        NaN,
        500000,
        'TX_NORTH_CENTRAL',
        1.0
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Easting');
    });

    it('should handle invalid northing', () => {
      const result = convertCoordinate(
        2000000,
        Infinity,
        'TX_NORTH_CENTRAL',
        1.0
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Northing');
    });

    it('should handle invalid CSF', () => {
      const result = convertCoordinate(
        2000000,
        500000,
        'TX_NORTH_CENTRAL',
        -1.0
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Combined Scale Factor');
    });

    it('should handle unknown coordinate system', () => {
      const result = convertCoordinate(
        2000000,
        500000,
        'INVALID_SYSTEM' as any,
        1.0
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown coordinate system');
    });

    it('should return properly formatted coordinates', () => {
      const result = convertCoordinate(
        2000000,
        500000,
        'TX_NORTH_CENTRAL',
        1.0
      );

      if (result.success) {
        // Latitude and longitude should have max 8 decimal places
        expect(result.latitude?.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(8);
        expect(result.longitude?.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('convertCoordinateBatch', () => {
    it('should convert multiple coordinates', () => {
      const coordinates = [
        { easting: 2000000, northing: 500000 },
        { easting: 2100000, northing: 600000 },
        { easting: 1900000, northing: 400000 },
      ];

      const result = convertCoordinateBatch(
        coordinates,
        'TX_NORTH_CENTRAL',
        1.0
      );

      expect(result.totalRows).toBe(3);
      expect(result.successfulRows).toBe(3);
      expect(result.failedRows).toBe(0);
      expect(result.results.length).toBe(3);
      expect(result.errors.length).toBe(0);

      result.results.forEach((r) => {
        expect(r.success).toBe(true);
        expect(r.latitude).toBeDefined();
        expect(r.longitude).toBeDefined();
      });
    });

    it('should handle mixed valid and invalid coordinates', () => {
      const coordinates = [
        { easting: 2000000, northing: 500000 },
        { easting: NaN, northing: 600000 },
        { easting: 1900000, northing: 400000 },
      ];

      const result = convertCoordinateBatch(
        coordinates,
        'TX_NORTH_CENTRAL',
        1.0
      );

      expect(result.totalRows).toBe(3);
      expect(result.successfulRows).toBe(2);
      expect(result.failedRows).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(2); // 1-indexed
    });

    it('should respect maximum batch size', () => {
      // Create array with 1001 coordinates
      const coordinates = Array.from({ length: 1001 }, (_, i) => ({
        easting: 2000000 + i * 100,
        northing: 500000 + i * 100,
      }));

      const result = convertCoordinateBatch(
        coordinates.slice(0, 1000), // Use max allowed
        'TX_NORTH_CENTRAL',
        1.0
      );

      expect(result.totalRows).toBe(1000);
      expect(result.successfulRows).toBe(1000);
    });

    it('should apply CSF to all batch coordinates', () => {
      const coordinates = [
        { easting: 2000000, northing: 500000 },
        { easting: 2100000, northing: 600000 },
      ];

      const result = convertCoordinateBatch(
        coordinates,
        'TX_NORTH_CENTRAL',
        0.99999
      );

      expect(result.successfulRows).toBe(2);
      result.results.forEach((r) => {
        expect(r.combinedScaleFactor).toBe(0.99999);
      });
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      const result = validateCoordinates(2000000, 500000);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-numeric easting', () => {
      const result = validateCoordinates(NaN, 500000);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Easting'))).toBe(true);
    });

    it('should reject non-numeric northing', () => {
      const result = validateCoordinates(2000000, NaN);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Northing'))).toBe(true);
    });

    it('should warn about out-of-range easting', () => {
      const result = validateCoordinates(500000, 500000); // Too low
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Easting'))).toBe(true);
    });

    it('should warn about out-of-range northing', () => {
      const result = validateCoordinates(2000000, 5000000); // Too high
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Northing'))).toBe(true);
    });
  });

  describe('validateCSF', () => {
    it('should validate correct CSF', () => {
      const result = validateCSF(1.0);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate CSF within typical range', () => {
      const result = validateCSF(0.99999);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-numeric CSF', () => {
      const result = validateCSF(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid number');
    });

    it('should reject zero CSF', () => {
      const result = validateCSF(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject negative CSF', () => {
      const result = validateCSF(-1.0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should warn about out-of-range CSF', () => {
      const result = validateCSF(2.0); // Too high
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('out of typical range');
    });
  });

  describe('getAvailableCoordinateSystems', () => {
    it('should return list of coordinate systems', () => {
      const systems = getAvailableCoordinateSystems();
      expect(Array.isArray(systems)).toBe(true);
      expect(systems.length).toBeGreaterThan(0);
    });

    it('should include Texas North Central', () => {
      const systems = getAvailableCoordinateSystems();
      const txNorthCentral = systems.find((s) => s.key === 'TX_NORTH_CENTRAL');
      expect(txNorthCentral).toBeDefined();
      expect(txNorthCentral?.epsg).toBe(2276);
    });

    it('should include all expected systems', () => {
      const systems = getAvailableCoordinateSystems();
      const keys = systems.map((s) => s.key);
      expect(keys).toContain('TX_NORTH_CENTRAL');
      expect(keys).toContain('TX_SOUTH_CENTRAL');
      expect(keys).toContain('TX_NORTH');
    });

    it('should include system metadata', () => {
      const systems = getAvailableCoordinateSystems();
      systems.forEach((system) => {
        expect(system.name).toBeDefined();
        expect(system.epsg).toBeDefined();
        expect(system.zone).toBeDefined();
        expect(system.units).toBe('us-ft');
      });
    });
  });

  describe('getCoordinateSystem', () => {
    it('should retrieve Texas North Central system', () => {
      const system = getCoordinateSystem('TX_NORTH_CENTRAL');
      expect(system).toBeDefined();
      expect(system?.epsg).toBe(2276);
      expect(system?.name).toContain('Texas North Central');
    });

    it('should retrieve Texas South Central system', () => {
      const system = getCoordinateSystem('TX_SOUTH_CENTRAL');
      expect(system).toBeDefined();
      expect(system?.epsg).toBe(2277);
    });

    it('should retrieve Texas North system', () => {
      const system = getCoordinateSystem('TX_NORTH');
      expect(system).toBeDefined();
      expect(system?.epsg).toBe(2927);
    });
  });

  describe('COORDINATE_SYSTEMS constant', () => {
    it('should have valid proj4 strings', () => {
      Object.values(COORDINATE_SYSTEMS).forEach((system) => {
        expect(system.proj4String).toBeDefined();
        expect(typeof system.proj4String).toBe('string');
        expect(system.proj4String.length).toBeGreaterThan(0);
        expect(system.proj4String).toContain('+proj=');
      });
    });

    it('should have US Survey Feet units', () => {
      Object.values(COORDINATE_SYSTEMS).forEach((system) => {
        expect(system.units).toBe('us-ft');
      });
    });

    it('should have NAD83 datum', () => {
      Object.values(COORDINATE_SYSTEMS).forEach((system) => {
        expect(system.zone).toBe('NAD83');
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle complete workflow: validate → convert → batch', () => {
      // Step 1: Validate input
      const validation = validateCoordinates(2000000, 500000);
      expect(validation.isValid).toBe(true);

      // Step 2: Convert single coordinate
      const single = convertCoordinate(2000000, 500000, 'TX_NORTH_CENTRAL', 1.0);
      expect(single.success).toBe(true);

      // Step 3: Batch convert including the validated coordinate
      const batch = convertCoordinateBatch(
        [
          { easting: 2000000, northing: 500000 },
          { easting: 2100000, northing: 600000 },
        ],
        'TX_NORTH_CENTRAL',
        1.0
      );
      expect(batch.successfulRows).toBe(2);
    });

    it('should handle different coordinate systems', () => {
      const systems: Array<'TX_NORTH_CENTRAL' | 'TX_SOUTH_CENTRAL' | 'TX_NORTH'> = [
        'TX_NORTH_CENTRAL',
        'TX_SOUTH_CENTRAL',
        'TX_NORTH',
      ];

      systems.forEach((system) => {
        const result = convertCoordinate(2000000, 500000, system, 1.0);
        expect(result.success).toBe(true);
        expect(result.systemKey).toBe(system);
      });
    });
  });
});
