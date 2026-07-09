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

export async function fetchTrains(modes: string[] = [...MODES]): Promise<TrainsResponse> {
  // Station graph comes from the (heavily cached) network payload.
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
    // Prefer the next station's coordinates as a fallback if we can't parse
    // the free-text location string.
    const nextStation = network.stations.find((s) => s.id === prediction.naptanId);
    const parsed = parseCurrentLocation(prediction.currentLocation, stationIndex, nextStation);

    if (!parsed) continue;

    const color = LINE_COLORS[prediction.lineId] ?? DEFAULT_LINE_COLOR;

    trains.push({
      id: `${prediction.lineId}:${prediction.vehicleId || prediction.id}`,
      vehicleId: prediction.vehicleId || prediction.id,
      lineId: prediction.lineId,
      lineName: prediction.lineName,
      color,
      mode: prediction.modeName || 'tube',
      lat: parsed.lat,
      lon: parsed.lon,
      // Sit a little above the elevated route so trains read clearly in 3D.
      elevation: modeElevation + 18,
      currentLocation: prediction.currentLocation || 'Unknown location',
      towards: prediction.towards,
      direction: prediction.direction,
      destinationName: prediction.destinationName,
      nextStationName: prediction.stationName,
      timeToNextStation: prediction.timeToStation,
    });
  }

  return {
    trains,
    updatedAt: new Date().toISOString(),
  };
}
