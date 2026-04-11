/**
 * MapLayerTree — Glassmorphic APWA Utility Layer Tree
 * Renders inside the /map HUD Layers panel.
 * Wires each utility type to a Mapbox GeoJSON layer so toggling
 * instantly shows/hides neon utility lines on the satellite map.
 *
 * Layer architecture:
 *   Each APWA utility type gets its own GeoJSON source + line layer.
 *   On mount we add all sources (empty) and layers.
 *   When the user drops a project with overlays those can be added separately.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Eye, EyeOff, Layers } from "lucide-react";
import mapboxgl from "mapbox-gl";

// ─── APWA standard utility palette ───────────────────────────────────────────
export const APWA_UTILITIES = [
  { id: "electric",       label: "Electric",        color: "#FF2222", glow: "rgba(255,34,34,0.4)" },
  { id: "gas",            label: "Gas / Oil",        color: "#FFEE00", glow: "rgba(255,238,0,0.4)" },
  { id: "water",          label: "Potable Water",    color: "#2255FF", glow: "rgba(34,85,255,0.4)" },
  { id: "sewer",          label: "Sewers / Drain",   color: "#00DD44", glow: "rgba(0,221,68,0.4)" },
  { id: "comm",           label: "Comm / Signal",    color: "#FF8C00", glow: "rgba(255,140,0,0.4)" },
  { id: "reclaimed",      label: "Reclaimed Water",  color: "#A020F0", glow: "rgba(160,32,240,0.4)" },
  { id: "survey",         label: "Survey",           color: "#FF1493", glow: "rgba(255,20,147,0.4)" },
  { id: "excavation",     label: "Excavation",       color: "#CCCCCC", glow: "rgba(200,200,200,0.3)" },
] as const;

// ─── Map style options ────────────────────────────────────────────────────────
const MAP_STYLES = [
  { label: "Dark Satellite",     id: "mapbox://styles/mapbox/satellite-v9" },
  { label: "Satellite Streets",  id: "mapbox://styles/mapbox/satellite-streets-v12" },
  { label: "Dark",               id: "mapbox://styles/mapbox/dark-v11" },
  { label: "Light",              id: "mapbox://styles/mapbox/light-v11" },
];

type UtilityId = typeof APWA_UTILITIES[number]["id"];

interface MapLayerTreeProps {
  map: mapboxgl.Map | null;
  /** Optional: project overlays already on the map (image layers) */
  overlayIds?: number[];
}

/** Add empty GeoJSON sources + neon line layers for each utility type */
function ensureUtilityLayers(map: mapboxgl.Map) {
  for (const u of APWA_UTILITIES) {
    const srcId = `apwa-src-${u.id}`;
    const layerId = `apwa-layer-${u.id}`;
    if (!map.getSource(srcId)) {
      map.addSource(srcId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "line",
        source: srcId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: "none", // hidden by default until user toggles on
        },
        paint: {
          "line-color": u.color,
          "line-width": 3,
          "line-opacity": 0.9,
          // Glow effect via blur
          "line-blur": 0,
        },
      });
    }
  }
}

export default function MapLayerTree({ map, overlayIds = [] }: MapLayerTreeProps) {
  const [utilityVisible, setUtilityVisible] = useState<Record<UtilityId, boolean>>(
    () => Object.fromEntries(APWA_UTILITIES.map((u) => [u.id, false])) as Record<UtilityId, boolean>
  );
  const [baseStyle, setBaseStyle] = useState("mapbox://styles/mapbox/satellite-v9");
  const [utilitiesExpanded, setUtilitiesExpanded] = useState(true);
  const [stylesExpanded, setStylesExpanded] = useState(false);
  const layersReady = useRef(false);

  // Ensure layers exist whenever map becomes available
  useEffect(() => {
    if (!map || layersReady.current) return;
    const init = () => {
      ensureUtilityLayers(map);
      layersReady.current = true;
    };
    if (map.isStyleLoaded()) {
      init();
    } else {
      map.once("styledata", init);
    }
    return () => {
      map.off("styledata", init);
    };
  }, [map]);

  // Re-add layers after style change (style change wipes all sources/layers)
  useEffect(() => {
    if (!map) return;
    const onStyleData = () => {
      layersReady.current = false;
      ensureUtilityLayers(map);
      layersReady.current = true;
      // Restore visibility state
      for (const u of APWA_UTILITIES) {
        const layerId = `apwa-layer-${u.id}`;
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(
            layerId,
            "visibility",
            utilityVisible[u.id] ? "visible" : "none"
          );
        }
      }
    };
    map.on("styledata", onStyleData);
    return () => { map.off("styledata", onStyleData); };
  }, [map, utilityVisible]);

  const toggleUtility = (id: UtilityId) => {
    const next = !utilityVisible[id];
    setUtilityVisible((prev) => ({ ...prev, [id]: next }));
    if (!map) return;
    const layerId = `apwa-layer-${id}`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", next ? "visible" : "none");
    }
  };

  const switchStyle = (styleId: string) => {
    setBaseStyle(styleId);
    map?.setStyle(styleId);
  };

  return (
    <div className="space-y-1 text-sm">

      {/* ─── Base Map Style ─── */}
      <SectionHeader
        label="Base Map"
        expanded={stylesExpanded}
        onToggle={() => setStylesExpanded((v) => !v)}
      />
      {stylesExpanded && (
        <div className="pl-3 space-y-0.5 pb-2">
          {MAP_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => switchStyle(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-xs ${
                baseStyle === s.id
                  ? "text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/25"
                  : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── APWA Utility Layers ─── */}
      <SectionHeader
        label="APWA Utilities"
        expanded={utilitiesExpanded}
        onToggle={() => setUtilitiesExpanded((v) => !v)}
      />
      {utilitiesExpanded && (
        <div className="pl-3 space-y-0.5 pb-2">
          {APWA_UTILITIES.map((u) => {
            const on = utilityVisible[u.id];
            return (
              <button
                key={u.id}
                onClick={() => toggleUtility(u.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs border ${
                  on
                    ? "bg-white/5 border-white/8 text-white"
                    : "border-transparent text-white/40 hover:text-white/70 hover:bg-white/4"
                }`}
              >
                {/* Color swatch */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: u.color,
                    boxShadow: on ? `0 0 6px ${u.glow}` : "none",
                  }}
                />
                <span className="flex-1 text-left">{u.label}</span>
                {on
                  ? <Eye className="w-3 h-3 text-white/40 flex-shrink-0" />
                  : <EyeOff className="w-3 h-3 text-white/20 flex-shrink-0" />
                }
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Project Overlays ─── */}
      {overlayIds.length > 0 && (
        <>
          <SectionHeader
            label={`Overlays (${overlayIds.length})`}
            expanded={false}
            onToggle={() => {}}
          />
          <div className="pl-3 pb-2">
            <p className="text-white/25 text-[11px] px-3 py-1">
              Manage overlays in the project sidebar.
            </p>
          </div>
        </>
      )}

      {/* ─── Hint ─── */}
      <p className="text-white/15 text-[10px] px-3 pt-2 leading-relaxed">
        Utility layers are empty until project data is loaded. Toggle to reserve the layer for incoming data.
      </p>
    </div>
  );
}

// ─── Section header with expand/collapse ─────────────────────────────────────
function SectionHeader({
  label,
  expanded,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-white/30 hover:text-white/60 transition-colors text-[11px] uppercase tracking-widest font-semibold"
    >
      {expanded
        ? <ChevronDown className="w-3 h-3" />
        : <ChevronRight className="w-3 h-3" />
      }
      {label}
    </button>
  );
}
