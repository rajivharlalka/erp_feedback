import { LineLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { hexToRgb } from '../lib/color';
import { SEVERITY_COLOR_RGB, SEVERITY_ELEVATION_LIFT } from '../lib/severity';
import type { LineFeature, ModeMeta, StationFeature } from '../lib/types';

interface LinePathDatum {
  lineId: string;
  name: string;
  mode: string;
  color: [number, number, number];
  elevation: number;
  path: [number, number][];
}

interface StemDatum {
  stationId: string;
  from: [number, number, number];
  to: [number, number, number];
  color: [number, number, number];
}

function baseElevationFor(mode: string, modeMeta: Record<string, ModeMeta>): number {
  return modeMeta[mode]?.baseElevation ?? 20;
}

function primaryMode(modes: string[]): string {
  return modes[0] ?? 'tube';
}

function flattenLinePaths(lines: LineFeature[], modeMeta: Record<string, ModeMeta>): LinePathDatum[] {
  const out: LinePathDatum[] = [];
  for (const line of lines) {
    const base = baseElevationFor(line.mode, modeMeta);
    const elevation = base + SEVERITY_ELEVATION_LIFT[line.severityTier] * 0.5;
    const color = hexToRgb(line.color);
    for (const path of line.paths) {
      if (path.length < 2) continue;
      out.push({ lineId: line.id, name: line.name, mode: line.mode, color, elevation, path });
    }
  }
  return out;
}

function stationElevation(station: StationFeature, modeMeta: Record<string, ModeMeta>): number {
  const base = baseElevationFor(primaryMode(station.modes), modeMeta);
  return base + SEVERITY_ELEVATION_LIFT[station.worstSeverityTier];
}

export interface BuildLayersOptions {
  lines: LineFeature[];
  stations: StationFeature[];
  modeMeta: Record<string, ModeMeta>;
  visibleModes: Set<string>;
  hoveredStationId: string | null;
  onHoverStation: (station: StationFeature | null, x: number, y: number) => void;
  onClickLine: (line: LineFeature) => void;
}

/**
 * Build the deck.gl overlay layers.
 *
 * Stations are drawn as severity-tinted scatterplot "icons" (with a thin stem
 * down to the ground) rather than raster IconLayer sprites. That keeps the
 * 3D plot reliable across browsers while still being mode-keyed via elevation
 * and ready to swap in per-mode SVG/PNG icons later.
 */
export function buildLayers({
  lines,
  stations,
  modeMeta,
  visibleModes,
  hoveredStationId,
  onHoverStation,
  onClickLine,
}: BuildLayersOptions) {
  const visibleLines = lines.filter((l) => visibleModes.has(l.mode));
  const visibleStations = stations.filter((s) => s.modes.some((m) => visibleModes.has(m)));

  const linePaths = flattenLinePaths(visibleLines, modeMeta);

  const stems: StemDatum[] = visibleStations.map((s) => ({
    stationId: s.id,
    from: [s.lon, s.lat, 0],
    to: [s.lon, s.lat, stationElevation(s, modeMeta)],
    color: SEVERITY_COLOR_RGB[s.worstSeverityTier],
  }));

  const routeLayer = new PathLayer<LinePathDatum>({
    id: 'tfl-lines',
    data: linePaths,
    getPath: (d) => d.path.map(([lon, lat]): [number, number, number] => [lon, lat, d.elevation]),
    getColor: (d) => [...d.color, 235],
    getWidth: 3,
    widthUnits: 'pixels',
    widthMinPixels: 2,
    widthMaxPixels: 6,
    capRounded: true,
    jointRounded: true,
    pickable: true,
    positionFormat: 'XYZ',
    onClick: (info) => {
      const datum = info.object as LinePathDatum | undefined;
      if (!datum) return;
      const line = visibleLines.find((l) => l.id === datum.lineId);
      if (line) onClickLine(line);
    },
  });

  const stemLayer = new LineLayer<StemDatum>({
    id: 'tfl-station-stems',
    data: stems,
    getSourcePosition: (d) => d.from,
    getTargetPosition: (d) => d.to,
    getColor: (d) => [...d.color, 110],
    getWidth: 1.5,
    widthUnits: 'pixels',
    pickable: false,
  });

  const stationLayer = new ScatterplotLayer<StationFeature>({
    id: 'tfl-stations',
    data: visibleStations,
    getPosition: (d) => [d.lon, d.lat, stationElevation(d, modeMeta)],
    getFillColor: (d) => [...SEVERITY_COLOR_RGB[d.worstSeverityTier], 230],
    getLineColor: [255, 255, 255, 220],
    getRadius: (d) => (d.id === hoveredStationId ? 90 : 55),
    radiusUnits: 'meters',
    radiusMinPixels: 3,
    radiusMaxPixels: 14,
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    pickable: true,
    positionFormat: 'XYZ',
    onHover: (info) => onHoverStation((info.object as StationFeature | undefined) ?? null, info.x, info.y),
    updateTriggers: {
      getRadius: [hoveredStationId],
    },
  });

  return [routeLayer, stemLayer, stationLayer];
}
