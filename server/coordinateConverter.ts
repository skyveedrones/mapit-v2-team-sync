/**
 * Coordinate Converter Service
 * Handles State Plane Coordinate (SPCS) to WGS84 (GPS) conversions
 * Supports multiple coordinate systems via EPSG codes
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
    proj4String: '+proj=lcc +lat_1=32.13333333333333 +lat_2=33.96666666666667 +lat_0=31.66666666666667 +lon_0=-98.5 +x_0=1500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  },
  'TX_SOUTH_CENTRAL': {
    name: 'Texas South Central - NAD83 - US Survey Feet',
    epsg: 2277,
    proj4String: '+proj=lcc +lat_1=30.28333333333333 +lat_2=31.88333333333333 +lat_0=29.66666666666667 +lon_0=-100.3333333333333 +x_0=1500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  },
  'TX_NORTH': {
    name: 'Texas North - NAD83 - US Survey Feet',
    epsg: 2927,
    proj4String: '+proj=lcc +lat_1=33.96666666666667 +lat_2=36.18333333333333 +lat_0=34.36666666666667 +lon_0=-101.5 +x_0=1500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  },
} as const;

export type CoordinateSystemKey = keyof typeof COORDINATE_SYSTEMS;

/**
 * WGS84 (GPS) projection definition
 */
const WGS84_PROJ4 = '+proj=longlat +datum=WGS84 +no_defs';

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
) {
  const system = COORDINATE_SYSTEMS[systemKey];
  if (!system) {
    throw new Error(`Unknown coordinate system: ${systemKey}`);
  }

  // Apply Combined Scale Factor (CSF) if provided
  // CSF converts from grid to ground coordinates
  const adjustedEasting = easting / combinedScaleFactor;
  const adjustedNorthing = northing / combinedScaleFactor;

  // Register the projection if not already registered
  proj4.defs(systemKey, system.proj4String);

  // Perform the transformation
  const [longitude, latitude] = proj4(systemKey, WGS84_PROJ4, [adjustedEasting, adjustedNorthing]);

  return {
    latitude: parseFloat(latitude.toFixed(8)),
    longitude: parseFloat(longitude.toFixed(8)),
    easting: adjustedEasting,
    northing: adjustedNorthing,
    systemKey,
    combinedScaleFactor,
  };
}

/**
 * Batch conversion of multiple coordinates
 * @param coordinates - Array of {easting, northing} objects
 * @param systemKey - Coordinate system key
 * @param combinedScaleFactor - Optional CSF
 * @returns Array of converted coordinates with metadata
 */
export function convertCoordinateBatch(
  coordinates: Array<{ easting: number; northing: number }>,
  systemKey: CoordinateSystemKey = 'TX_NORTH_CENTRAL',
  combinedScaleFactor: number = 1.0
) {
  return coordinates.map((coord, index) => {
    try {
      return {
        index,
        ...convertCoordinate(coord.easting, coord.northing, systemKey, combinedScaleFactor),
        error: null,
      };
    } catch (error) {
      return {
        index,
        error: error instanceof Error ? error.message : 'Unknown error',
        latitude: null,
        longitude: null,
      };
    }
  });
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

  // Basic sanity check for Texas coordinates (in feet)
  // Texas SPCS coordinates typically range from 1.2M to 2.3M feet
  if (easting < 1000000 || easting > 3000000) {
    errors.push('Easting appears out of range for Texas (expected 1M-3M feet)');
  }

  if (northing < 0 || northing > 3000000) {
    errors.push('Northing appears out of range for Texas (expected 0-3M feet)');
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
