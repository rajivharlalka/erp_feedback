import {
  CACHE_TTL_ARRIVALS_MS,
  DEFAULT_LINE_COLOR,
  LINE_COLORS,
  MODE_META,
  MODES,
  TUBE_LINE_IDS,
} from './config';
import { TtlCache } from './cache';
import { tflGet } from './tflClient';
import { buildStationIndex, parseCurrentLocation } from './trainLocation';
import type { TflPredictionRaw, TrainFeature, TrainsResponse } from './types';
import { fetchNetwork } from './tflNetworkService';

const arrivalsCache = new TtlCache<TflPredictionRaw[]>(CACHE_TTL_ARRIVALS_MS);

async function fetchArrivals(lineIds: string[]): Promise<TflPredictionRaw[]> {
  const key = `arrivals:${lineIds.join(',')}`;
  return arrivalsCache.getOrFetch(key, () =>
    tflGet<TflPredictionRaw[]>(`/Line/${lineIds.join(',')}/Arrivals`),
  );
}

/**
 * Collapse many per-station predictions into one live position per vehicle.
 * For each vehicle we keep the soonest arrival — its `currentLocation` is the
 * freshest Trackernet string describing where that train is right now.
 */
function pickBestPredictionPerVehicle(predictions: TflPredictionRaw[]): TflPredictionRaw[] {
  const best = new Map<string, TflPredictionRaw>();

  for (const prediction of predictions) {
    const vehicleKey = prediction.vehicleId?.trim() || prediction.id;
    if (!vehicleKey) continue;

    const existing = best.get(vehicleKey);
    if (!existing || prediction.timeToStation < existing.timeToStation) {
      best.set(vehicleKey, prediction);
    }
  }

  return [...best.values()];
}

function headingBetween(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  if (Math.abs(dLat) < 1e-10 && Math.abs(dLon) < 1e-10) return 0;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

export async function fetchTrains(modes: string[] = [...MODES]): Promise<TrainsResponse> {
  const network = await fetchNetwork(modes);
  const stationIndex = buildStationIndex(network.stations);

  const lineIds = modes.includes('tube')
    ? [...TUBE_LINE_IDS]
    : network.lines.map((l) => l.id);

  const predictions = await fetchArrivals(lineIds);
  const perVehicle = pickBestPredictionPerVehicle(predictions);

  const modeElevation = MODE_META.tube?.baseElevation ?? 20;
  const trains: TrainFeature[] = [];

  for (const prediction of perVehicle) {
    const nextStation = network.stations.find((s) => s.id === prediction.naptanId);

    const parsed = parseCurrentLocation(
      prediction.currentLocation,
      stationIndex,
      nextStation
        ? { lat: nextStation.lat, lon: nextStation.lon, id: nextStation.id }
        : undefined,
    );

    if (!parsed) continue;

    const color = LINE_COLORS[prediction.lineId] ?? DEFAULT_LINE_COLOR;

    // TfL only reports a coarse text location, not GPS.  Do not invent a
    // straight-line path to a destination or use ETA as a position estimate:
    // either can put a carriage across London from its actual route.
    //
    // A segment is retained only when Trackernet explicitly says "Between A
    // and B"; it provides a trustworthy orientation for the carriage, while
    // its reported midpoint remains the display position.
    const hasConfirmedSegment =
      parsed.fromLat != null &&
      parsed.fromLon != null &&
      parsed.toLat != null &&
      parsed.toLon != null;
    const segmentFromLat = hasConfirmedSegment ? parsed.fromLat : undefined;
    const segmentFromLon = hasConfirmedSegment ? parsed.fromLon : undefined;
    const segmentToLat = hasConfirmedSegment ? parsed.toLat : undefined;
    const segmentToLon = hasConfirmedSegment ? parsed.toLon : undefined;
    const segmentProgress = hasConfirmedSegment ? parsed.progress : undefined;
    const heading =
      parsed.heading ??
      (hasConfirmedSegment
        ? headingBetween(segmentFromLat!, segmentFromLon!, segmentToLat!, segmentToLon!)
        : undefined);

    trains.push({
      id: `${prediction.lineId}:${prediction.vehicleId || prediction.id}`,
      vehicleId: prediction.vehicleId || prediction.id,
      lineId: prediction.lineId,
      lineName: prediction.lineName,
      color,
      mode: prediction.modeName || 'tube',
      lat: parsed.lat,
      lon: parsed.lon,
      elevation: modeElevation + 18,
      currentLocation: prediction.currentLocation || 'Unknown location',
      towards: prediction.towards,
      direction: prediction.direction,
      destinationName: prediction.destinationName,
      nextStationName: prediction.stationName,
      timeToNextStation: prediction.timeToStation,
      segmentFromLat,
      segmentFromLon,
      segmentToLat,
      segmentToLon,
      segmentProgress,
      heading,
    });
  }

  return {
    trains,
    updatedAt: new Date().toISOString(),
  };
}
