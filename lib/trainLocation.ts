/**
 * Parse TfL Trackernet-style `currentLocation` strings into a lat/lon by
 * matching station names against the network graph.
 *
 * Examples we see live:
 *   "Between Walthamstow Central and Blackhorse Road"
 *   "At Victoria"
 *   "At Platform"
 *   "Departed Oxford Circus"
 *   "Approaching Finsbury Park"
 *   "Approaching Moorgate Platform 2"
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

/** Strip trailing platform / track suffixes from free-text location fragments. */
function stripPlatformSuffix(name: string): string {
  return name
    .replace(/\s+platform\s+\d+\w*$/i, '')
    .replace(/\s+plt\.?\s*\d+\w*$/i, '')
    .replace(/\s+track\s+\d+\w*$/i, '')
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
  const needle = normalizeStationName(stripPlatformSuffix(rawName));
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

function headingBetween(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  if (Math.abs(dLat) < 1e-10 && Math.abs(dLon) < 1e-10) return 0;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

export interface ParsedLocation {
  lat: number;
  lon: number;
  /** 0 = at a station, 0.5 = midpoint between two stations. */
  progress: number;
  fromStationId?: string;
  toStationId?: string;
  fromLat?: number;
  fromLon?: number;
  toLat?: number;
  toLon?: number;
  heading?: number;
}

export function parseCurrentLocation(
  currentLocation: string | undefined,
  index: Map<string, StationRef>,
  fallback?: { lat: number; lon: number; id?: string },
): ParsedLocation | null {
  if (!currentLocation) {
    return fallback
      ? {
          lat: fallback.lat,
          lon: fallback.lon,
          progress: 0,
          fromStationId: fallback.id,
          fromLat: fallback.lat,
          fromLon: fallback.lon,
        }
      : null;
  }

  const trimmed = currentLocation.trim();

  // Bare "At Platform" / "At platform" — TfL often omits the station name.
  if (/^at\s+platform\b/i.test(trimmed) || /^platform\b/i.test(trimmed)) {
    return fallback
      ? {
          lat: fallback.lat,
          lon: fallback.lon,
          progress: 0,
          fromStationId: fallback.id,
          fromLat: fallback.lat,
          fromLon: fallback.lon,
        }
      : null;
  }

  const between = /^Between\s+(.+?)\s+and\s+(.+)$/i.exec(trimmed);
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
        fromLat: a.lat,
        fromLon: a.lon,
        toLat: b.lat,
        toLon: b.lon,
        heading: headingBetween(a.lat, a.lon, b.lat, b.lon),
      };
    }
    if (a) {
      return {
        lat: a.lat,
        lon: a.lon,
        progress: 0.25,
        fromStationId: a.id,
        fromLat: a.lat,
        fromLon: a.lon,
      };
    }
    if (b) {
      return {
        lat: b.lat,
        lon: b.lon,
        progress: 0.75,
        toStationId: b.id,
        toLat: b.lat,
        toLon: b.lon,
      };
    }
  }

  const approaching =
    /^(?:Approaching|Entering|Arriving(?:\s+at)?)\s+(.+)$/i.exec(trimmed);
  if (approaching) {
    const station = findStation(index, approaching[1]);
    if (station) {
      return {
        // Sit slightly short of the platform so the carriage still reads as inbound.
        lat: station.lat,
        lon: station.lon,
        progress: 0.85,
        toStationId: station.id,
        toLat: station.lat,
        toLon: station.lon,
      };
    }
  }

  const departed = /^(?:Departed|Left|Leaving)\s+(.+)$/i.exec(trimmed);
  if (departed) {
    const station = findStation(index, departed[1]);
    if (station) {
      return {
        lat: station.lat,
        lon: station.lon,
        progress: 0.15,
        fromStationId: station.id,
        fromLat: station.lat,
        fromLon: station.lon,
      };
    }
  }

  const at = /^(?:At)\s+(.+)$/i.exec(trimmed);
  if (at) {
    const station = findStation(index, at[1]);
    if (station) {
      return {
        lat: station.lat,
        lon: station.lon,
        progress: 0,
        fromStationId: station.id,
        fromLat: station.lat,
        fromLon: station.lon,
      };
    }
  }

  // "Harrow & Wealdstone Siding", "Northumberland Park Depot", etc.
  const siding = /^(.+?)\s+(?:Siding|Depot|Yard|Sidings)\b/i.exec(trimmed);
  if (siding) {
    const station = findStation(index, siding[1]);
    if (station) {
      return {
        lat: station.lat,
        lon: station.lon,
        progress: 0,
        fromStationId: station.id,
        fromLat: station.lat,
        fromLon: station.lon,
      };
    }
  }

  // Last resort: try the whole string as a station name.
  const whole = findStation(index, trimmed);
  if (whole) {
    return {
      lat: whole.lat,
      lon: whole.lon,
      progress: 0,
      fromStationId: whole.id,
      fromLat: whole.lat,
      fromLon: whole.lon,
    };
  }

  return fallback
    ? {
        lat: fallback.lat,
        lon: fallback.lon,
        progress: 0,
        fromStationId: fallback.id,
        fromLat: fallback.lat,
        fromLon: fallback.lon,
      }
    : null;
}
