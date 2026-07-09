/**
 * Parse TfL Trackernet-style `currentLocation` strings into a lat/lon by
 * matching station names against the network graph.
 *
 * Examples we see live:
 *   "Between Walthamstow Central and Blackhorse Road"
 *   "At Victoria"
 *   "Departed Oxford Circus"
 *   "Approaching Finsbury Park"
 *   "Between Kings Cross St. Pancras and Highbury & Isl"  (truncated)
 */

export interface StationRef {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bunderground station\b/g, '')
    .replace(/\bstation\b/g, '')
    .replace(/\bst\.\s*/g, 'st ')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function buildStationIndex(stations: StationRef[]): Map<string, StationRef> {
  const index = new Map<string, StationRef>();
  for (const station of stations) {
    const full = normalizeStationName(station.name);
    index.set(full, station);
    // Also index without trailing words so "victoria" matches "victoria underground station".
    const short = full.replace(/\s+underground$/, '').trim();
    if (short && !index.has(short)) index.set(short, station);
  }
  return index;
}

function findStation(index: Map<string, StationRef>, rawName: string): StationRef | null {
  const needle = normalizeStationName(rawName);
  if (!needle) return null;

  const exact = index.get(needle);
  if (exact) return exact;

  // Truncated names ("Highbury & Isl") and partial matches.
  let best: StationRef | null = null;
  let bestScore = 0;
  for (const [key, station] of index) {
    if (key.startsWith(needle) || needle.startsWith(key)) {
      const score = Math.min(key.length, needle.length);
      if (score > bestScore) {
        best = station;
        bestScore = score;
      }
    }
  }
  return best;
}

export interface ParsedLocation {
  lat: number;
  lon: number;
  /** 0 = at a station, 0.5 = midpoint between two stations. */
  progress: number;
  fromStationId?: string;
  toStationId?: string;
}

export function parseCurrentLocation(
  currentLocation: string | undefined,
  index: Map<string, StationRef>,
  fallback?: { lat: number; lon: number },
): ParsedLocation | null {
  if (!currentLocation) {
    return fallback ? { lat: fallback.lat, lon: fallback.lon, progress: 0 } : null;
  }

  const between = /^Between\s+(.+?)\s+and\s+(.+)$/i.exec(currentLocation);
  if (between) {
    const a = findStation(index, between[1]);
    const b = findStation(index, between[2]);
    if (a && b) {
      return {
        lat: (a.lat + b.lat) / 2,
        lon: (a.lon + b.lon) / 2,
        progress: 0.5,
        fromStationId: a.id,
        toStationId: b.id,
      };
    }
    if (a) return { lat: a.lat, lon: a.lon, progress: 0.25, fromStationId: a.id };
    if (b) return { lat: b.lat, lon: b.lon, progress: 0.75, toStationId: b.id };
  }

  const at =
    /^(?:At|Departed|Left|Leaving|Approaching|Entering|Arriving|Platform)\s+(.+)$/i.exec(currentLocation);
  if (at) {
    const station = findStation(index, at[1]);
    if (station) {
      return { lat: station.lat, lon: station.lon, progress: 0, fromStationId: station.id };
    }
  }

  // "Harrow & Wealdstone Siding", "Northumberland Park Depot", etc.
  const siding = /^(.+?)\s+(?:Siding|Depot|Yard|Sidings)\b/i.exec(currentLocation);
  if (siding) {
    const station = findStation(index, siding[1]);
    if (station) {
      return { lat: station.lat, lon: station.lon, progress: 0, fromStationId: station.id };
    }
  }

  // Last resort: try the whole string as a station name.
  const whole = findStation(index, currentLocation);
  if (whole) return { lat: whole.lat, lon: whole.lon, progress: 0, fromStationId: whole.id };

  return fallback ? { lat: fallback.lat, lon: fallback.lon, progress: 0 } : null;
}
