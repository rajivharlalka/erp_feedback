import { CACHE_TTL_ROUTE_MS, CACHE_TTL_STATUS_MS, DEFAULT_LINE_COLOR, LINE_COLORS, MODE_META } from './config.js';
import { TtlCache } from './cache.js';
import { tflGet } from './tflClient.js';
import { severityTier, worstTier } from './severity.js';
import { LineFeature, NetworkResponse, StationFeature, TflLineRaw, TflRouteSequenceRaw } from './types.js';

const statusCache = new TtlCache<TflLineRaw[]>(CACHE_TTL_STATUS_MS);
const routeCache = new TtlCache<TflRouteSequenceRaw>(CACHE_TTL_ROUTE_MS);

function parseLineStrings(lineStrings: string[]): [number, number][][] {
  const paths: [number, number][][] = [];
  const seen = new Set<string>();

  for (const raw of lineStrings) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    for (const segment of parsed) {
      if (!Array.isArray(segment) || segment.length < 2) continue;
      const key = JSON.stringify(segment);
      if (seen.has(key)) continue;
      seen.add(key);
      paths.push(segment as [number, number][]);
    }
  }
  return paths;
}

async function fetchStatus(modes: string[]): Promise<TflLineRaw[]> {
  const key = `status:${modes.join(',')}`;
  return statusCache.getOrFetch(key, () => tflGet<TflLineRaw[]>(`/Line/Mode/${modes.join(',')}/Status`));
}

async function fetchRouteSequence(lineId: string): Promise<TflRouteSequenceRaw> {
  const key = `route:${lineId}`;
  return routeCache.getOrFetch(key, () => tflGet<TflRouteSequenceRaw>(`/Line/${lineId}/Route/Sequence/outbound`));
}

export async function fetchNetwork(modes: string[]): Promise<NetworkResponse> {
  const rawLines = await fetchStatus(modes);

  const routeSequences = await Promise.all(
    rawLines.map(async (line) => {
      try {
        return await fetchRouteSequence(line.id);
      } catch (err) {
        console.error(`Failed to fetch route sequence for line "${line.id}":`, err);
        return null;
      }
    }),
  );

  const lines: LineFeature[] = rawLines.map((line, idx) => {
    const primaryStatus = line.lineStatuses[0];
    const statusSeverity = primaryStatus?.statusSeverity ?? 10;
    const statusSeverityDescription = primaryStatus?.statusSeverityDescription ?? 'Good Service';
    const route = routeSequences[idx];

    return {
      id: line.id,
      name: line.name,
      mode: line.modeName,
      color: LINE_COLORS[line.id] ?? DEFAULT_LINE_COLOR,
      statusSeverity,
      statusSeverityDescription,
      severityTier: severityTier(statusSeverityDescription, statusSeverity),
      reason: primaryStatus?.reason,
      paths: route ? parseLineStrings(route.lineStrings) : [],
    };
  });

  const lineTierById = new Map(lines.map((l) => [l.id, l.severityTier]));

  const stationsById = new Map<string, StationFeature>();
  for (const route of routeSequences) {
    if (!route) continue;
    for (const stop of route.stations) {
      const existing = stationsById.get(stop.id);
      const tier = lineTierById.get(route.lineId) ?? 'good';

      if (existing) {
        if (!existing.lineIds.includes(route.lineId)) existing.lineIds.push(route.lineId);
        for (const mode of stop.modes) {
          if (!existing.modes.includes(mode)) existing.modes.push(mode);
        }
        existing.worstSeverityTier = worstTier([existing.worstSeverityTier, tier]);
      } else {
        stationsById.set(stop.id, {
          id: stop.id,
          name: stop.name,
          lat: stop.lat,
          lon: stop.lon,
          modes: [...stop.modes],
          lineIds: [route.lineId],
          worstSeverityTier: tier,
        });
      }
    }
  }

  const modeMeta = Object.fromEntries(modes.map((mode) => [mode, MODE_META[mode]]).filter(([, meta]) => meta));

  return {
    modes,
    modeMeta,
    lines,
    stations: [...stationsById.values()],
    updatedAt: new Date().toISOString(),
  };
}
