/**
 * Central place for everything "mode aware" so enabling a new TfL mode later
 * (DLR, Overground, Elizabeth line, Tram, River Bus, Cable Car) is a matter of
 * adding entries here rather than touching the fetch/route/layer logic.
 */

export const TFL_BASE_URL = 'https://api.tfl.gov.uk';

/** Modes this deployment currently fetches from TfL. Start small, grow later. */
export const MODES = ['tube'] as const;
export type Mode = (typeof MODES)[number];

export const ALL_KNOWN_MODES = [
  'tube',
  'dlr',
  'overground',
  'elizabeth-line',
  'tram',
  'river-bus',
  'cable-car',
] as const;

export interface ModeMeta {
  displayName: string;
  /** Base height (meters) the 3D layers render this mode's lines/stations at. */
  baseElevation: number;
  /** Icon id -> resolves to /icons/{icon}.svg on the frontend. */
  icon: string;
}

export const MODE_META: Record<string, ModeMeta> = {
  tube: { displayName: 'London Underground', baseElevation: 20, icon: 'tube' },
  dlr: { displayName: 'DLR', baseElevation: 40, icon: 'dlr' },
  overground: { displayName: 'London Overground', baseElevation: 60, icon: 'overground' },
  'elizabeth-line': { displayName: 'Elizabeth line', baseElevation: 80, icon: 'elizabeth-line' },
  tram: { displayName: 'Tram', baseElevation: 100, icon: 'tram' },
  'river-bus': { displayName: 'River Bus', baseElevation: 0, icon: 'river-bus' },
  'cable-car': { displayName: 'Cable Car', baseElevation: 120, icon: 'cable-car' },
};

/** Official-ish TfL line colors, keyed by line id as returned by the API. */
export const LINE_COLORS: Record<string, string> = {
  // Tube
  bakerloo: '#B36305',
  central: '#E32017',
  circle: '#FFD300',
  district: '#00782A',
  'hammersmith-city': '#F3A9BB',
  jubilee: '#A0A5A9',
  metropolitan: '#9B0056',
  northern: '#000000',
  piccadilly: '#003688',
  victoria: '#0098D4',
  'waterloo-city': '#95CDBA',
  // DLR
  dlr: '#00A4A7',
  // London Overground (2024 named sub-lines) - reserved for when overground is enabled
  lioness: '#FFA600',
  mildmay: '#006FE6',
  windrush: '#EE2E24',
  weaver: '#A45A2A',
  suffragette: '#61C6AA',
  liberty: '#4C4C4A',
  'london-overground': '#EE7C0E',
  // Elizabeth line
  'elizabeth-line': '#6950A1',
  // Tram
  tram: '#84B817',
  // River Bus (piers/services vary; single reserved fallback color)
  'river-bus': '#00A0E2',
  // Cable car
  'cable-car': '#DC241F',
};

export const DEFAULT_LINE_COLOR = '#6B7280';

export const CACHE_TTL_STATUS_MS = 45_000; // status changes frequently
export const CACHE_TTL_ROUTE_MS = 12 * 60 * 60 * 1000; // geometry is near-static

export const PORT = Number(process.env.PORT) || 3001;
