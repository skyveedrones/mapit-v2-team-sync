/**
 * Coordinate Converter Service
 * Handles State Plane Coordinate (SPCS) to WGS84 (GPS) conversions
 * Supports multiple coordinate systems via EPSG codes
 * Includes Combined Scale Factor (CSF) application for ground-to-grid conversions
 */

import proj4 from 'proj4';

/**
 * Coordinate system definitions with EPSG codes
 * Supports Texas zones and can be extended for other states
 */
export const COORDINATE_SYSTEMS = {
  'TX_NORTH_CENTRAL': {
    name: 'Texas North Central - NAD83 - US Survey Feet',
    epsg: 2276,
    zone: 'NAD83',
    units: 'us-ft',
    description: 'State Plane Coordinate System Zone 4202 (Texas North Central)',
    proj4String: '+proj=lcc +lat_1=32.13333333333333 +lat_2=33.96666666666667 +lat_0=31.66666666666667 +lon_0=-98.5 +x_0=1500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  },
  'TX_SOUTH_CENTRAL': {
    name: 'Texas South Central - NAD83 - US Survey Feet',
    epsg: 2277,
    zone: 'NAD83',
    units: 'us-ft',
    description: 'State Plane Coordinate System Zone 4203 (Texas South Central)',
    proj4String: '+proj=lcc +lat_1=30.28333333333333 +lat_2=31.88333333333333 +lat_0=29.66666666666667 +lon_0=-100.3333333333333 +x_0=1500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  },
  'TX_NORTH': {
    name: 'Texas North - NAD83 - US Survey Feet',
    epsg: 2927,
    zone: 'NAD83',
    units: 'us-ft',
    description: 'State Plane Coordinate System Zone 4201 (Texas North)',
    proj4String: '+proj=lcc +lat_1=33.96666666666667 +lat_2=36.18333333333333 +lat_0=34.36666666666667 +lon_0=-101.5 +x_0=1500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  },
} as const;

export type CoordinateSystemKey = keyof typeof COORDINATE_SYSTEMS;

/**
 * WGS84 (GPS) projection definition
 * Standard latitude/longitude coordinates
 */
const WGS84_PROJ4 = '+proj=longlat +datum=WGS84 +no_defs';

/**
 * Conversion result interface
 */
export interface ConversionResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  easting?: number;
  northing?: number;
  systemKey?: CoordinateSystemKey;
  combinedScaleFactor?: number;
  error?: string;
}

/**
 * Batch conversion result interface
 */
export interface BatchConversionResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  results: Array<ConversionResult & { index: number }>;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Single coordinate conversion from SPCS to WGS84
 * @param easting - Easting coordinate in feet
 * @param northing - Northing coordinate in feet
 * @param systemKey - Coordinate system key (e.g., 'TX_NORTH_CENTRAL')
 * @param combinedScaleFactor - Optional CSF for ground-to-grid adjustment (default: 1.0)
 * @returns Object with latitude, longitude, and metadata
 */
export function convertCoordinate(
  easting: number,
  northing: number,
  systemKey: CoordinateSystemKey = 'TX_NORTH_CENTRAL',
  combinedScaleFactor: number = 1.0
): ConversionResult {
  try {
    // Validate inputs
    if (!Number.isFinite(easting)) {
      return {
        success: false,
        error: 'Easting must be a valid number',
      };
    }

    if (!Number.isFinite(northing)) {
      return {
        success: false,
        error: 'Northing must be a valid number',
      };
    }

    if (!Number.isFinite(combinedScaleFactor) || combinedScaleFactor <= 0) {
      return {
        success: false,
        error: 'Combined Scale Factor must be a positive number',
      };
    }

    const system = COORDINATE_SYSTEMS[systemKey];
    if (!system) {
      return {
        success: false,
        error: `Unknown coordinate system: ${systemKey}`,
      };
    }

    // Apply Combined Scale Factor (CSF) if provided
    // CSF converts from grid to ground coordinates
    // If CSF < 1.0, we divide to scale up; if CSF > 1.0, we divide to scale down
    const adjustedEasting = easting / combinedScaleFactor;
    const adjustedNorthing = northing / combinedScaleFactor;

    // Register the projection if not already registered
    proj4.defs(systemKey, system.proj4String);

    // Perform the transformation
    const [longitude, latitude] = proj4(systemKey, WGS84_PROJ4, [adjustedEasting, adjustedNorthing]);

    // Validate transformation results
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        success: false,
        error: 'Transformation resulted in invalid coordinates',
      };
    }

    // Validate latitude/longitude ranges
    if (latitude < -90 || latitude > 90) {
      return {
        success: false,
        error: `Resulting latitude ${latitude} is out of valid range [-90, 90]`,
      };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        success: false,
        error: `Resulting longitude ${longitude} is out of valid range [-180, 180]`,
      };
    }

    return {
      success: true,
      latitude: parseFloat(latitude.toFixed(8)),
      longitude: parseFloat(longitude.toFixed(8)),
      easting: parseFloat(adjustedEasting.toFixed(2)),
      northing: parseFloat(adjustedNorthing.toFixed(2)),
      systemKey,
      combinedScaleFactor,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown conversion error',
    };
  }
}

/**
 * Batch conversion of multiple coordinates
 * @param coordinates - Array of {easting, northing} objects
 * @param systemKey - Coordinate system key
 * @param combinedScaleFactor - Optional CSF
 * @returns Batch conversion result with summary and per-row details
 */
export function convertCoordinateBatch(
  coordinates: Array<{ easting: number; northing: number }>,
  systemKey: CoordinateSystemKey = 'TX_NORTH_CENTRAL',
  combinedScaleFactor: number = 1.0
): BatchConversionResult {
  const results: Array<ConversionResult & { index: number }> = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const result = convertCoordinate(coord.easting, coord.northing, systemKey, combinedScaleFactor);

    results.push({
      index: i,
      ...result,
    });

    if (!result.success && result.error) {
      errors.push({
        row: i + 1, // 1-indexed for user-facing messages
        error: result.error,
      });
    }
  }

  return {
    totalRows: coordinates.length,
    successfulRows: results.filter((r) => r.success).length,
    failedRows: errors.length,
    results,
    errors,
  };
}

/**
 * Validate coordinate values
 * @param easting - Easting value
 * @param northing - Northing value
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCoordinates(easting: number, northing: number) {
  const errors: string[] = [];

  if (typeof easting !== 'number' || isNaN(easting)) {
    errors.push('Easting must be a valid number');
  }

  if (typeof northing !== 'number' || isNaN(northing)) {
    errors.push('Northing must be a valid number');
  }

  // Sanity check for Texas SPCS coordinates in US Survey Feet.
  // False easting is 1,500,000 ft for all TX zones; valid Easting range ~500k-3.5M ft.
  // Northing origin is 0 (y_0=0) for all TX zones; valid Northing range 0-20M ft
  // (TX North zone 4201 northing can reach ~18M ft at the northern boundary).
  if (easting < 500000 || easting > 3500000) {
    errors.push('Easting appears out of range for Texas (expected 500k-3.5M feet)');
  }

  if (northing < 0 || northing > 20000000) {
    errors.push('Northing appears out of range for Texas (expected 0-20M feet)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get all available coordinate systems
 */
export function getAvailableCoordinateSystems() {
  return Object.entries(COORDINATE_SYSTEMS).map(([key, system]) => ({
    key,
    ...system,
  }));
}

/**
 * Get coordinate system by key
 */
export function getCoordinateSystem(key: CoordinateSystemKey) {
  return COORDINATE_SYSTEMS[key];
}

/**
 * Validate Combined Scale Factor
 * @param csf - Combined Scale Factor value
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCSF(csf: number) {
  if (!Number.isFinite(csf)) {
    return {
      isValid: false,
      error: 'CSF must be a valid number',
    };
  }

  if (csf <= 0) {
    return {
      isValid: false,
      error: 'CSF must be greater than 0',
    };
  }

  // Typical CSF values are between 0.99 and 1.01
  if (csf < 0.9 || csf > 1.1) {
    return {
      isValid: false,
      error: 'CSF appears out of typical range (0.9-1.1). Please verify the value.',
    };
  }

  return {
    isValid: true,
  };
}
