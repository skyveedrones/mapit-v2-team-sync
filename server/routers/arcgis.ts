import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';

/**
 * ArcGIS REST API Router
 * Queries public ArcGIS FeatureServer endpoints using a bounding box
 * and returns GeoJSON for rendering as Mapbox overlays.
 */

const ARCGIS_SOURCES = [
  {
    id: 'forney_zoning',
    label: 'Forney Zoning Districts',
    url: 'https://arcgisint.forneytx.gov/arcgis/rest/services/Distribution/Forney_Zoning_Districts/FeatureServer/0',
    outFields: 'zoning,description,acres',
    color: '#f59e0b', // amber
    type: 'fill' as const,
  },
  {
    id: 'txdot_row_parcels',
    label: 'TxDOT ROW Parcels (Existing)',
    url: 'https://maps.dot.state.tx.us/arcgis/rest/services/ROW/RPAM_TxDOTCONNECT/MapServer/10',
    outFields: 'OBJECTID,comment,district,created_by',
    color: '#ef4444', // red
    type: 'fill' as const,
  },
  {
    id: 'txdot_row_lines',
    label: 'TxDOT ROW Lines (Existing)',
    url: 'https://maps.dot.state.tx.us/arcgis/rest/services/ROW/RPAM_TxDOTCONNECT/MapServer/9',
    outFields: 'OBJECTID,comment,district',
    color: '#f97316', // orange
    type: 'line' as const,
  },
  {
    id: 'fema_flood_zones',
    label: 'FEMA Flood Zones (Nationwide)',
    url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0',
    outFields: 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STUDY_TYP',
    color: '#3b82f6', // blue (default; frontend overrides per zone)
    type: 'fill' as const,
  },
];

async function queryArcGIS(
  url: string,
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  outFields: string
): Promise<GeoJSON.FeatureCollection> {
  const geometry = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
  const params = new URLSearchParams({
    geometry,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    f: 'geojson',
    resultRecordCount: '200',
  });

  const res = await fetch(`${url}/query?${params.toString()}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`ArcGIS query failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as GeoJSON.FeatureCollection & { error?: { message: string } };

  if (data.error) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }

  return data;
}

export const arcgisRouter = router({
  /**
   * List available ArcGIS data sources
   */
  getSources: protectedProcedure.query(() => {
    return ARCGIS_SOURCES.map(({ id, label, color, type }) => ({ id, label, color, type }));
  }),

  /**
   * Query a specific ArcGIS source by bounding box
   */
  queryByBbox: protectedProcedure
    .input(z.object({
      sourceId: z.string(),
      minLng: z.number(),
      minLat: z.number(),
      maxLng: z.number(),
      maxLat: z.number(),
    }))
    .mutation(async ({ input }) => {
      const source = ARCGIS_SOURCES.find(s => s.id === input.sourceId);
      if (!source) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown source: ${input.sourceId}` });
      }

      try {
        const geojson = await queryArcGIS(source.url, input, source.outFields);
        return {
          sourceId: source.id,
          label: source.label,
          color: source.color,
          type: source.type,
          featureCount: geojson.features?.length ?? 0,
          geojson,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'ArcGIS query failed',
        });
      }
    }),

  /**
   * Query all sources at once by bounding box
   */
  queryAllByBbox: protectedProcedure
    .input(z.object({
      minLng: z.number(),
      minLat: z.number(),
      maxLng: z.number(),
      maxLat: z.number(),
    }))
    .mutation(async ({ input }) => {
      const results = await Promise.allSettled(
        ARCGIS_SOURCES.map(async (source) => {
          const geojson = await queryArcGIS(source.url, input, source.outFields);
          return {
            sourceId: source.id,
            label: source.label,
            color: source.color,
            type: source.type,
            featureCount: geojson.features?.length ?? 0,
            geojson,
          };
        })
      );

      return results.map((result, i) => {
        if (result.status === 'fulfilled') return result.value;
        return {
          sourceId: ARCGIS_SOURCES[i].id,
          label: ARCGIS_SOURCES[i].label,
          color: ARCGIS_SOURCES[i].color,
          type: ARCGIS_SOURCES[i].type,
          featureCount: 0,
          geojson: null,
          error: result.reason instanceof Error ? result.reason.message : 'Query failed',
        };
      });
    }),
});
