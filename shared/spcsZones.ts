/**
 * US State Plane Coordinate System (SPCS) zones — NAD83, US Survey Feet
 * Used for cascading State → Zone dropdowns in the Smart Survey tab.
 */

export interface SpcsZone {
  key: string;         // unique key used as EPSG identifier string
  name: string;        // human-readable zone name
  epsg: number;        // EPSG code
  proj4String: string; // proj4 projection string
}

export interface SpcsState {
  name: string;
  abbr: string;
  zones: SpcsZone[];
}

export const SPCS_STATES: SpcsState[] = [
  {
    name: 'Alabama', abbr: 'AL',
    zones: [
      { key: 'AL_EAST', name: 'Alabama East', epsg: 26929, proj4String: '+proj=tmerc +lat_0=30.5 +lon_0=-85.83333333333333 +k=0.99996 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AL_WEST', name: 'Alabama West', epsg: 26930, proj4String: '+proj=tmerc +lat_0=30 +lon_0=-87.5 +k=0.999933333 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Alaska', abbr: 'AK',
    zones: [
      { key: 'AK_1', name: 'Alaska Zone 1', epsg: 26931, proj4String: '+proj=omerc +lat_0=57 +lonc=-133.6666666666667 +alpha=323.1301023611111 +k=0.9999 +x_0=5000000.001016002 +y_0=-5000000.001016002 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_2', name: 'Alaska Zone 2', epsg: 26932, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-142 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_3', name: 'Alaska Zone 3', epsg: 26933, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-146 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_4', name: 'Alaska Zone 4', epsg: 26934, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-150 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_5', name: 'Alaska Zone 5', epsg: 26935, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-154 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_6', name: 'Alaska Zone 6', epsg: 26936, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-158 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_7', name: 'Alaska Zone 7', epsg: 26937, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-162 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_8', name: 'Alaska Zone 8', epsg: 26938, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-166 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_9', name: 'Alaska Zone 9', epsg: 26939, proj4String: '+proj=tmerc +lat_0=54 +lon_0=-170 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AK_10', name: 'Alaska Zone 10', epsg: 26940, proj4String: '+proj=lcc +lat_1=51.83333333333334 +lat_2=53.83333333333334 +lat_0=51 +lon_0=-176 +x_0=1000000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Arizona', abbr: 'AZ',
    zones: [
      { key: 'AZ_EAST', name: 'Arizona East', epsg: 26948, proj4String: '+proj=tmerc +lat_0=31 +lon_0=-110.1666666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AZ_CENTRAL', name: 'Arizona Central', epsg: 26949, proj4String: '+proj=tmerc +lat_0=31 +lon_0=-111.9166666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AZ_WEST', name: 'Arizona West', epsg: 26950, proj4String: '+proj=tmerc +lat_0=31 +lon_0=-113.75 +k=0.999933333 +x_0=213360 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Arkansas', abbr: 'AR',
    zones: [
      { key: 'AR_NORTH', name: 'Arkansas North', epsg: 26951, proj4String: '+proj=lcc +lat_1=34.93333333333333 +lat_2=36.23333333333333 +lat_0=34.33333333333334 +lon_0=-92 +x_0=400000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'AR_SOUTH', name: 'Arkansas South', epsg: 26952, proj4String: '+proj=lcc +lat_1=33.3 +lat_2=34.76666666666667 +lat_0=32.66666666666666 +lon_0=-92 +x_0=400000.0001016001 +y_0=400000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'California', abbr: 'CA',
    zones: [
      { key: 'CA_1', name: 'California Zone 1', epsg: 26941, proj4String: '+proj=lcc +lat_1=40 +lat_2=41.66666666666666 +lat_0=39.33333333333334 +lon_0=-122 +x_0=2000000.0001016002 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CA_2', name: 'California Zone 2', epsg: 26942, proj4String: '+proj=lcc +lat_1=38.33333333333334 +lat_2=39.83333333333334 +lat_0=37.66666666666666 +lon_0=-122 +x_0=2000000.0001016002 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CA_3', name: 'California Zone 3', epsg: 26943, proj4String: '+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000.0001016002 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CA_4', name: 'California Zone 4', epsg: 26944, proj4String: '+proj=lcc +lat_1=36 +lat_2=37.25 +lat_0=35.33333333333334 +lon_0=-119 +x_0=2000000.0001016002 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CA_5', name: 'California Zone 5', epsg: 26945, proj4String: '+proj=lcc +lat_1=34.03333333333333 +lat_2=35.46666666666667 +lat_0=33.5 +lon_0=-118 +x_0=2000000.0001016002 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CA_6', name: 'California Zone 6', epsg: 26946, proj4String: '+proj=lcc +lat_1=32.78333333333333 +lat_2=33.88333333333333 +lat_0=32.16666666666666 +lon_0=-116.25 +x_0=2000000.0001016002 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Colorado', abbr: 'CO',
    zones: [
      { key: 'CO_NORTH', name: 'Colorado North', epsg: 26953, proj4String: '+proj=lcc +lat_1=39.71666666666667 +lat_2=40.78333333333333 +lat_0=39.33333333333334 +lon_0=-105.5 +x_0=914401.8289 +y_0=304800.6096 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CO_CENTRAL', name: 'Colorado Central', epsg: 26954, proj4String: '+proj=lcc +lat_1=38.45 +lat_2=39.75 +lat_0=37.83333333333334 +lon_0=-105.5 +x_0=914401.8289 +y_0=304800.6096 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'CO_SOUTH', name: 'Colorado South', epsg: 26955, proj4String: '+proj=lcc +lat_1=37.23333333333333 +lat_2=38.43333333333333 +lat_0=36.66666666666666 +lon_0=-105.5 +x_0=914401.8289 +y_0=304800.6096 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Connecticut', abbr: 'CT',
    zones: [
      { key: 'CT', name: 'Connecticut', epsg: 26956, proj4String: '+proj=lcc +lat_1=41.2 +lat_2=41.86666666666667 +lat_0=40.83333333333334 +lon_0=-72.75 +x_0=304800.6096 +y_0=152400.3048 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Delaware', abbr: 'DE',
    zones: [
      { key: 'DE', name: 'Delaware', epsg: 26957, proj4String: '+proj=tmerc +lat_0=38 +lon_0=-75.41666666666667 +k=0.999995 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Florida', abbr: 'FL',
    zones: [
      { key: 'FL_EAST', name: 'Florida East', epsg: 26958, proj4String: '+proj=tmerc +lat_0=24.33333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'FL_WEST', name: 'Florida West', epsg: 26959, proj4String: '+proj=tmerc +lat_0=24.33333333333333 +lon_0=-82 +k=0.999941177 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'FL_NORTH', name: 'Florida North', epsg: 26960, proj4String: '+proj=lcc +lat_1=29.58333333333333 +lat_2=30.75 +lat_0=29 +lon_0=-84.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Georgia', abbr: 'GA',
    zones: [
      { key: 'GA_EAST', name: 'Georgia East', epsg: 26966, proj4String: '+proj=tmerc +lat_0=30 +lon_0=-82.16666666666667 +k=0.9999 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'GA_WEST', name: 'Georgia West', epsg: 26967, proj4String: '+proj=tmerc +lat_0=30 +lon_0=-84.16666666666667 +k=0.9999 +x_0=700000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Hawaii', abbr: 'HI',
    zones: [
      { key: 'HI_1', name: 'Hawaii Zone 1', epsg: 26961, proj4String: '+proj=tmerc +lat_0=18.83333333333333 +lon_0=-155.5 +k=0.999967 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'HI_2', name: 'Hawaii Zone 2', epsg: 26962, proj4String: '+proj=tmerc +lat_0=20.33333333333333 +lon_0=-156.6666666666667 +k=0.999967 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'HI_3', name: 'Hawaii Zone 3', epsg: 26963, proj4String: '+proj=tmerc +lat_0=21.16666666666667 +lon_0=-158 +k=0.99999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'HI_4', name: 'Hawaii Zone 4', epsg: 26964, proj4String: '+proj=tmerc +lat_0=21.83333333333333 +lon_0=-159.5 +k=0.99999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'HI_5', name: 'Hawaii Zone 5', epsg: 26965, proj4String: '+proj=tmerc +lat_0=21.66666666666667 +lon_0=-160.1666666666667 +k=1 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Idaho', abbr: 'ID',
    zones: [
      { key: 'ID_EAST', name: 'Idaho East', epsg: 26968, proj4String: '+proj=tmerc +lat_0=41.66666666666666 +lon_0=-112.1666666666667 +k=0.9999473679 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'ID_CENTRAL', name: 'Idaho Central', epsg: 26969, proj4String: '+proj=tmerc +lat_0=41.66666666666666 +lon_0=-114 +k=0.9999473679 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'ID_WEST', name: 'Idaho West', epsg: 26970, proj4String: '+proj=tmerc +lat_0=41.66666666666666 +lon_0=-115.75 +k=0.9999333333 +x_0=800000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Illinois', abbr: 'IL',
    zones: [
      { key: 'IL_EAST', name: 'Illinois East', epsg: 26971, proj4String: '+proj=tmerc +lat_0=36.66666666666666 +lon_0=-88.33333333333333 +k=0.9999749999 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'IL_WEST', name: 'Illinois West', epsg: 26972, proj4String: '+proj=tmerc +lat_0=36.66666666666666 +lon_0=-90.16666666666667 +k=0.9999411765 +x_0=700000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Indiana', abbr: 'IN',
    zones: [
      { key: 'IN_EAST', name: 'Indiana East', epsg: 26973, proj4String: '+proj=tmerc +lat_0=37.5 +lon_0=-85.66666666666667 +k=0.999966667 +x_0=100000 +y_0=250000 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'IN_WEST', name: 'Indiana West', epsg: 26974, proj4String: '+proj=tmerc +lat_0=37.5 +lon_0=-87.08333333333333 +k=0.999966667 +x_0=900000 +y_0=250000 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Iowa', abbr: 'IA',
    zones: [
      { key: 'IA_NORTH', name: 'Iowa North', epsg: 26975, proj4String: '+proj=lcc +lat_1=42.06666666666667 +lat_2=43.26666666666667 +lat_0=41.5 +lon_0=-93.5 +x_0=1500000 +y_0=1000000 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'IA_SOUTH', name: 'Iowa South', epsg: 26976, proj4String: '+proj=lcc +lat_1=40.61666666666667 +lat_2=41.78333333333333 +lat_0=40 +lon_0=-93.5 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Kansas', abbr: 'KS',
    zones: [
      { key: 'KS_NORTH', name: 'Kansas North', epsg: 26977, proj4String: '+proj=lcc +lat_1=38.71666666666667 +lat_2=39.78333333333333 +lat_0=38.33333333333334 +lon_0=-98 +x_0=400000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'KS_SOUTH', name: 'Kansas South', epsg: 26978, proj4String: '+proj=lcc +lat_1=37.26666666666667 +lat_2=38.56666666666667 +lat_0=36.66666666666666 +lon_0=-98.5 +x_0=400000.0001016001 +y_0=400000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Kentucky', abbr: 'KY',
    zones: [
      { key: 'KY_NORTH', name: 'Kentucky North', epsg: 26979, proj4String: '+proj=lcc +lat_1=37.96666666666667 +lat_2=38.96666666666667 +lat_0=37.5 +lon_0=-84.25 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'KY_SOUTH', name: 'Kentucky South', epsg: 26980, proj4String: '+proj=lcc +lat_1=36.73333333333333 +lat_2=37.93333333333333 +lat_0=36.33333333333334 +lon_0=-85.75 +x_0=500000.0001016001 +y_0=500000.0001016001 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Louisiana', abbr: 'LA',
    zones: [
      { key: 'LA_NORTH', name: 'Louisiana North', epsg: 26981, proj4String: '+proj=lcc +lat_1=31.16666666666667 +lat_2=32.66666666666666 +lat_0=30.5 +lon_0=-92.5 +x_0=1000000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'LA_SOUTH', name: 'Louisiana South', epsg: 26982, proj4String: '+proj=lcc +lat_1=29.3 +lat_2=30.7 +lat_0=28.5 +lon_0=-91.33333333333333 +x_0=1000000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Maine', abbr: 'ME',
    zones: [
      { key: 'ME_EAST', name: 'Maine East', epsg: 26983, proj4String: '+proj=tmerc +lat_0=43.66666666666666 +lon_0=-68.5 +k=0.9999 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'ME_WEST', name: 'Maine West', epsg: 26984, proj4String: '+proj=tmerc +lat_0=42.83333333333334 +lon_0=-70.16666666666667 +k=0.999966667 +x_0=900000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Maryland', abbr: 'MD',
    zones: [
      { key: 'MD', name: 'Maryland', epsg: 26985, proj4String: '+proj=lcc +lat_1=38.3 +lat_2=39.45 +lat_0=37.66666666666666 +lon_0=-77 +x_0=400000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Massachusetts', abbr: 'MA',
    zones: [
      { key: 'MA_MAINLAND', name: 'Massachusetts Mainland', epsg: 26986, proj4String: '+proj=lcc +lat_1=41.71666666666667 +lat_2=42.68333333333333 +lat_0=41 +lon_0=-71.5 +x_0=200000.0001016002 +y_0=750000 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MA_ISLAND', name: 'Massachusetts Island', epsg: 26987, proj4String: '+proj=lcc +lat_1=41.28333333333333 +lat_2=41.48333333333333 +lat_0=41 +lon_0=-70.5 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Michigan', abbr: 'MI',
    zones: [
      { key: 'MI_NORTH', name: 'Michigan North', epsg: 26988, proj4String: '+proj=lcc +lat_1=45.48333333333333 +lat_2=47.08333333333334 +lat_0=44.78333333333333 +lon_0=-87 +x_0=7999999.999968001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MI_CENTRAL', name: 'Michigan Central', epsg: 26989, proj4String: '+proj=lcc +lat_1=44.18333333333333 +lat_2=45.7 +lat_0=43.31666666666667 +lon_0=-84.36666666666666 +x_0=5999999.999976001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MI_SOUTH', name: 'Michigan South', epsg: 26990, proj4String: '+proj=lcc +lat_1=42.1 +lat_2=43.66666666666666 +lat_0=41.5 +lon_0=-84.36666666666666 +x_0=3999999.999984 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Minnesota', abbr: 'MN',
    zones: [
      { key: 'MN_NORTH', name: 'Minnesota North', epsg: 26991, proj4String: '+proj=lcc +lat_1=47.03333333333333 +lat_2=48.63333333333333 +lat_0=46.5 +lon_0=-93.1 +x_0=800000.0001016001 +y_0=99999.99989839978 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MN_CENTRAL', name: 'Minnesota Central', epsg: 26992, proj4String: '+proj=lcc +lat_1=45.61666666666667 +lat_2=47.05 +lat_0=45 +lon_0=-94.25 +x_0=800000.0001016001 +y_0=99999.99989839978 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MN_SOUTH', name: 'Minnesota South', epsg: 26993, proj4String: '+proj=lcc +lat_1=43.78333333333333 +lat_2=45.21666666666667 +lat_0=43 +lon_0=-94 +x_0=800000.0001016001 +y_0=99999.99989839978 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Mississippi', abbr: 'MS',
    zones: [
      { key: 'MS_EAST', name: 'Mississippi East', epsg: 26994, proj4String: '+proj=tmerc +lat_0=29.5 +lon_0=-88.83333333333333 +k=0.99995 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MS_WEST', name: 'Mississippi West', epsg: 26995, proj4String: '+proj=tmerc +lat_0=29.5 +lon_0=-90.33333333333333 +k=0.99995 +x_0=700000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Missouri', abbr: 'MO',
    zones: [
      { key: 'MO_EAST', name: 'Missouri East', epsg: 26996, proj4String: '+proj=tmerc +lat_0=35.83333333333334 +lon_0=-90.5 +k=0.9999333333 +x_0=250000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MO_CENTRAL', name: 'Missouri Central', epsg: 26997, proj4String: '+proj=tmerc +lat_0=35.83333333333334 +lon_0=-92.5 +k=0.9999333333 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'MO_WEST', name: 'Missouri West', epsg: 26998, proj4String: '+proj=tmerc +lat_0=36.16666666666666 +lon_0=-94.5 +k=0.9999411765 +x_0=850000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Montana', abbr: 'MT',
    zones: [
      { key: 'MT', name: 'Montana', epsg: 32100, proj4String: '+proj=lcc +lat_1=45 +lat_2=49 +lat_0=44.25 +lon_0=-109.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Nebraska', abbr: 'NE',
    zones: [
      { key: 'NE', name: 'Nebraska', epsg: 32104, proj4String: '+proj=lcc +lat_1=40 +lat_2=43 +lat_0=39.83333333333334 +lon_0=-100 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Nevada', abbr: 'NV',
    zones: [
      { key: 'NV_EAST', name: 'Nevada East', epsg: 32107, proj4String: '+proj=tmerc +lat_0=34.75 +lon_0=-115.5833333333333 +k=0.9999 +x_0=200000.0001016002 +y_0=7999999.999968001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NV_CENTRAL', name: 'Nevada Central', epsg: 32108, proj4String: '+proj=tmerc +lat_0=34.75 +lon_0=-116.6666666666667 +k=0.9999 +x_0=500000.0001016001 +y_0=5999999.999976001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NV_WEST', name: 'Nevada West', epsg: 32109, proj4String: '+proj=tmerc +lat_0=34.75 +lon_0=-118.5833333333333 +k=0.9999 +x_0=800000.0001016001 +y_0=3999999.999984 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'New Hampshire', abbr: 'NH',
    zones: [
      { key: 'NH', name: 'New Hampshire', epsg: 32110, proj4String: '+proj=tmerc +lat_0=42.5 +lon_0=-71.66666666666667 +k=0.999966667 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'New Jersey', abbr: 'NJ',
    zones: [
      { key: 'NJ', name: 'New Jersey', epsg: 32111, proj4String: '+proj=tmerc +lat_0=38.83333333333334 +lon_0=-74.5 +k=0.9999 +x_0=150000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'New Mexico', abbr: 'NM',
    zones: [
      { key: 'NM_EAST', name: 'New Mexico East', epsg: 32112, proj4String: '+proj=tmerc +lat_0=31 +lon_0=-104.3333333333333 +k=0.9999090909 +x_0=165000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NM_CENTRAL', name: 'New Mexico Central', epsg: 32113, proj4String: '+proj=tmerc +lat_0=31 +lon_0=-106.25 +k=0.9999 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NM_WEST', name: 'New Mexico West', epsg: 32114, proj4String: '+proj=tmerc +lat_0=31 +lon_0=-107.8333333333333 +k=0.9999166667 +x_0=830000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'New York', abbr: 'NY',
    zones: [
      { key: 'NY_EAST', name: 'New York East', epsg: 32115, proj4String: '+proj=tmerc +lat_0=38.83333333333334 +lon_0=-74.5 +k=0.9999 +x_0=150000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NY_CENTRAL', name: 'New York Central', epsg: 32116, proj4String: '+proj=tmerc +lat_0=40 +lon_0=-76.58333333333333 +k=0.9999375 +x_0=250000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NY_WEST', name: 'New York West', epsg: 32117, proj4String: '+proj=tmerc +lat_0=40 +lon_0=-78.58333333333333 +k=0.9999375 +x_0=350000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'NY_LONG_ISLAND', name: 'New York Long Island', epsg: 32118, proj4String: '+proj=lcc +lat_1=40.66666666666666 +lat_2=41.03333333333333 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'North Carolina', abbr: 'NC',
    zones: [
      { key: 'NC', name: 'North Carolina', epsg: 32119, proj4String: '+proj=lcc +lat_1=34.33333333333334 +lat_2=36.16666666666666 +lat_0=33.75 +lon_0=-79 +x_0=609601.2192024384 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'North Dakota', abbr: 'ND',
    zones: [
      { key: 'ND_NORTH', name: 'North Dakota North', epsg: 32120, proj4String: '+proj=lcc +lat_1=47.43333333333333 +lat_2=48.73333333333333 +lat_0=47 +lon_0=-100.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'ND_SOUTH', name: 'North Dakota South', epsg: 32121, proj4String: '+proj=lcc +lat_1=46.18333333333333 +lat_2=47.48333333333333 +lat_0=45.66666666666666 +lon_0=-100.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Ohio', abbr: 'OH',
    zones: [
      { key: 'OH_NORTH', name: 'Ohio North', epsg: 32122, proj4String: '+proj=lcc +lat_1=40.43333333333333 +lat_2=41.7 +lat_0=39.66666666666666 +lon_0=-82.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'OH_SOUTH', name: 'Ohio South', epsg: 32123, proj4String: '+proj=lcc +lat_1=38.73333333333333 +lat_2=40.03333333333333 +lat_0=38 +lon_0=-82.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Oklahoma', abbr: 'OK',
    zones: [
      { key: 'OK_NORTH', name: 'Oklahoma North', epsg: 32124, proj4String: '+proj=lcc +lat_1=35.56666666666667 +lat_2=36.76666666666667 +lat_0=35 +lon_0=-98 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'OK_SOUTH', name: 'Oklahoma South', epsg: 32125, proj4String: '+proj=lcc +lat_1=33.93333333333333 +lat_2=35.23333333333333 +lat_0=33.33333333333334 +lon_0=-98 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Oregon', abbr: 'OR',
    zones: [
      { key: 'OR_NORTH', name: 'Oregon North', epsg: 32126, proj4String: '+proj=lcc +lat_1=44.33333333333334 +lat_2=46 +lat_0=43.66666666666666 +lon_0=-120.5 +x_0=2500000.0001424 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'OR_SOUTH', name: 'Oregon South', epsg: 32127, proj4String: '+proj=lcc +lat_1=42.33333333333334 +lat_2=44 +lat_0=41.66666666666666 +lon_0=-120.5 +x_0=1500000.0001464 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Pennsylvania', abbr: 'PA',
    zones: [
      { key: 'PA_NORTH', name: 'Pennsylvania North', epsg: 32128, proj4String: '+proj=lcc +lat_1=40.88333333333333 +lat_2=41.95 +lat_0=40.16666666666666 +lon_0=-77.75 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'PA_SOUTH', name: 'Pennsylvania South', epsg: 32129, proj4String: '+proj=lcc +lat_1=39.93333333333333 +lat_2=40.96666666666667 +lat_0=39.33333333333334 +lon_0=-77.75 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Rhode Island', abbr: 'RI',
    zones: [
      { key: 'RI', name: 'Rhode Island', epsg: 32130, proj4String: '+proj=tmerc +lat_0=41.08333333333334 +lon_0=-71.5 +k=0.99999375 +x_0=100000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'South Carolina', abbr: 'SC',
    zones: [
      { key: 'SC', name: 'South Carolina', epsg: 32133, proj4String: '+proj=lcc +lat_1=32.5 +lat_2=34.83333333333334 +lat_0=31.83333333333333 +lon_0=-81 +x_0=609600 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'South Dakota', abbr: 'SD',
    zones: [
      { key: 'SD_NORTH', name: 'South Dakota North', epsg: 32134, proj4String: '+proj=lcc +lat_1=44.41666666666666 +lat_2=45.68333333333333 +lat_0=43.83333333333334 +lon_0=-100 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'SD_SOUTH', name: 'South Dakota South', epsg: 32135, proj4String: '+proj=lcc +lat_1=42.83333333333334 +lat_2=44.4 +lat_0=42.33333333333334 +lon_0=-100.3333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Tennessee', abbr: 'TN',
    zones: [
      { key: 'TN', name: 'Tennessee', epsg: 32136, proj4String: '+proj=lcc +lat_1=35.25 +lat_2=36.41666666666666 +lat_0=34.33333333333334 +lon_0=-86 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Texas', abbr: 'TX',
    zones: [
      { key: 'TX_NORTH', name: 'Texas North', epsg: 32137, proj4String: '+proj=lcc +lat_1=34.65 +lat_2=36.18333333333333 +lat_0=34 +lon_0=-101.5 +x_0=200000.0001016002 +y_0=1000000.0001016002 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'TX_NORTH_CENTRAL', name: 'Texas North Central', epsg: 2276, proj4String: '+proj=lcc +lat_1=32.13333333333333 +lat_2=33.96666666666667 +lat_0=31.66666666666667 +lon_0=-98.5 +x_0=600000.0 +y_0=2000000.0001016002 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'TX_CENTRAL', name: 'Texas Central', epsg: 32139, proj4String: '+proj=lcc +lat_1=30.11666666666667 +lat_2=31.88333333333333 +lat_0=29.66666666666667 +lon_0=-100.3333333333333 +x_0=700000 +y_0=3000000 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'TX_SOUTH_CENTRAL', name: 'Texas South Central', epsg: 2277, proj4String: '+proj=lcc +lat_1=28.38333333333333 +lat_2=30.28333333333333 +lat_0=27.83333333333333 +lon_0=-99.0 +x_0=600000.0 +y_0=4000000.0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'TX_SOUTH', name: 'Texas South', epsg: 32141, proj4String: '+proj=lcc +lat_1=26.16666666666667 +lat_2=27.83333333333333 +lat_0=25.66666666666667 +lon_0=-98.5 +x_0=300000.0000000001 +y_0=5000000.001016002 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Utah', abbr: 'UT',
    zones: [
      { key: 'UT_NORTH', name: 'Utah North', epsg: 32142, proj4String: '+proj=lcc +lat_1=40.71666666666667 +lat_2=41.78333333333333 +lat_0=40.33333333333334 +lon_0=-111.5 +x_0=500000.0001016001 +y_0=999999.9999960001 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'UT_CENTRAL', name: 'Utah Central', epsg: 32143, proj4String: '+proj=lcc +lat_1=39.01666666666667 +lat_2=40.65 +lat_0=38.33333333333334 +lon_0=-111.5 +x_0=500000.0001016001 +y_0=1999999.999992 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'UT_SOUTH', name: 'Utah South', epsg: 32144, proj4String: '+proj=lcc +lat_1=37.21666666666667 +lat_2=38.35 +lat_0=36.66666666666666 +lon_0=-111.5 +x_0=500000.0001016001 +y_0=2999999.999988 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Vermont', abbr: 'VT',
    zones: [
      { key: 'VT', name: 'Vermont', epsg: 32145, proj4String: '+proj=tmerc +lat_0=42.5 +lon_0=-72.5 +k=0.999964286 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Virginia', abbr: 'VA',
    zones: [
      { key: 'VA_NORTH', name: 'Virginia North', epsg: 32146, proj4String: '+proj=lcc +lat_1=38.03333333333333 +lat_2=39.2 +lat_0=37.66666666666666 +lon_0=-78.5 +x_0=3500000.0001016 +y_0=2000000.0001016002 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'VA_SOUTH', name: 'Virginia South', epsg: 32147, proj4String: '+proj=lcc +lat_1=36.76666666666667 +lat_2=37.96666666666667 +lat_0=36.33333333333334 +lon_0=-78.5 +x_0=3500000.0001016 +y_0=999999.9998983998 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Washington', abbr: 'WA',
    zones: [
      { key: 'WA_NORTH', name: 'Washington North', epsg: 32148, proj4String: '+proj=lcc +lat_1=47.5 +lat_2=48.73333333333333 +lat_0=47 +lon_0=-120.8333333333333 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WA_SOUTH', name: 'Washington South', epsg: 32149, proj4String: '+proj=lcc +lat_1=45.83333333333334 +lat_2=47.33333333333334 +lat_0=45.33333333333334 +lon_0=-120.5 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'West Virginia', abbr: 'WV',
    zones: [
      { key: 'WV_NORTH', name: 'West Virginia North', epsg: 32150, proj4String: '+proj=lcc +lat_1=39 +lat_2=40.25 +lat_0=38.5 +lon_0=-79.5 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WV_SOUTH', name: 'West Virginia South', epsg: 32151, proj4String: '+proj=lcc +lat_1=37.48333333333333 +lat_2=38.88333333333333 +lat_0=37 +lon_0=-81 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Wisconsin', abbr: 'WI',
    zones: [
      { key: 'WI_NORTH', name: 'Wisconsin North', epsg: 32152, proj4String: '+proj=lcc +lat_1=45.56666666666667 +lat_2=46.76666666666667 +lat_0=45.16666666666666 +lon_0=-90 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WI_CENTRAL', name: 'Wisconsin Central', epsg: 32153, proj4String: '+proj=lcc +lat_1=44.25 +lat_2=45.5 +lat_0=43.83333333333334 +lon_0=-90 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WI_SOUTH', name: 'Wisconsin South', epsg: 32154, proj4String: '+proj=lcc +lat_1=42.73333333333333 +lat_2=44.06666666666667 +lat_0=42 +lon_0=-90 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
  {
    name: 'Wyoming', abbr: 'WY',
    zones: [
      { key: 'WY_EAST', name: 'Wyoming East', epsg: 32155, proj4String: '+proj=tmerc +lat_0=40.5 +lon_0=-105.1666666666667 +k=0.9999375 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WY_EAST_CENTRAL', name: 'Wyoming East Central', epsg: 32156, proj4String: '+proj=tmerc +lat_0=40.5 +lon_0=-107.3333333333333 +k=0.9999375 +x_0=400000.0001016001 +y_0=100000 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WY_WEST_CENTRAL', name: 'Wyoming West Central', epsg: 32157, proj4String: '+proj=tmerc +lat_0=40.5 +lon_0=-108.75 +k=0.9999375 +x_0=600000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs' },
      { key: 'WY_WEST', name: 'Wyoming West', epsg: 32158, proj4String: '+proj=tmerc +lat_0=40.5 +lon_0=-110.0833333333333 +k=0.9999375 +x_0=800000.0001016001 +y_0=100000 +ellps=GRS80 +units=us-ft +no_defs' },
    ],
  },
];

/** Flat lookup: key → SpcsZone */
export const SPCS_ZONE_BY_KEY: Record<string, SpcsZone> = {};
for (const state of SPCS_STATES) {
  for (const zone of state.zones) {
    SPCS_ZONE_BY_KEY[zone.key] = zone;
  }
}

/** Default zone key (Texas North Central) */
export const DEFAULT_SPCS_KEY = 'TX_NORTH_CENTRAL';
