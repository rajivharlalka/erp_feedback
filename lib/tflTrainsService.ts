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
import type { StationFeature, TflPredictionRaw, TrainFeature, TrainsResponse } from './types';
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

function findStationByIdOrName(
  stations: StationFeature[],
  index: Map<string, { id: string; name: string; lat: number; lon: number }>,
  naptanId?: string,
  name?: string,
): StationFeature | null {
  if (naptanId) {
    const byId = stations.find((s) => s.id === naptanId);
    if (byId) return byId;
  }
  if (name) {
    const needle = name
      .toLowerCase()
      .replace(/\bunderground station\b/g, '')
      .replace(/\bstation\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const hit = index.get(needle);
    if (hit) return stations.find((s) => s.id === hit.id) ?? null;
  }
  return null;
}

function headingBetween(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  if (Math.abs(dLat) < 1e-10 && Math.abs(dLon) < 1e-10) return 0;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

function almostSame(aLat: number, aLon: number, bLat: number, bLon: number): boolean {
  return Math.abs(aLat - bLat) < 1e-5 && Math.abs(aLon - bLon) < 1e-5;
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
    const nextStation =
      network.stations.find((s) => s.id === prediction.naptanId) ??
      findStationByIdOrName(network.stations, stationIndex, prediction.naptanId, prediction.stationName);

    const destination = findStationByIdOrName(
      network.stations,
      stationIndex,
      prediction.destinationNaptanId,
      prediction.destinationName,
    );

    const parsed = parseCurrentLocation(
      prediction.currentLocation,
      stationIndex,
      nextStation
        ? { lat: nextStation.lat, lon: nextStation.lon, id: nextStation.id }
        : undefined,
    );

    if (!parsed) continue;

    const color = LINE_COLORS[prediction.lineId] ?? DEFAULT_LINE_COLOR;

    let segmentFromLat = parsed.fromLat;
    let segmentFromLon = parsed.fromLon;
    let segmentToLat = parsed.toLat;
    let segmentToLon = parsed.toLon;
    let segmentProgress = parsed.progress ?? 0;
    let heading = parsed.heading;

    // Complete a one-sided segment using next/destination stations.
    if (segmentFromLat != null && segmentFromLon != null && segmentToLat == null) {
      const target =
        nextStation && !almostSame(segmentFromLat, segmentFromLon, nextStation.lat, nextStation.lon)
          ? nextStation
          : destination && !almostSame(segmentFromLat, segmentFromLon, destination.lat, destination.lon)
            ? destination
            : null;
      if (target) {
        segmentToLat = target.lat;
        segmentToLon = target.lon;
      }
    }

    if (segmentToLat != null && segmentToLon != null && segmentFromLat == null) {
      const origin =
        destination && !almostSame(segmentToLat, segmentToLon, destination.lat, destination.lon)
          ? destination
          : null;
      if (origin) {
        segmentFromLat = origin.lat;
        segmentFromLon = origin.lon;
      } else {
        // Synthetic inbound so the mesh still has a non-zero heading.
        segmentFromLat = segmentToLat - 0.0005;
        segmentFromLon = segmentToLon;
      }
    }

    // Platform trains with no segment yet: face toward destination from the platform.
    if (
      segmentFromLat == null &&
      segmentToLat == null &&
      nextStation &&
      destination &&
      !almostSame(nextStation.lat, nextStation.lon, destination.lat, destination.lon)
    ) {
      segmentFromLat = nextStation.lat;
      segmentFromLon = nextStation.lon;
      segmentToLat = destination.lat;
      segmentToLon = destination.lon;
      segmentProgress = 0;
    }

    if (
      segmentFromLat != null &&
      segmentFromLon != null &&
      segmentToLat != null &&
      segmentToLon != null
    ) {
      heading = heading ?? headingBetween(segmentFromLat, segmentFromLon, segmentToLat, segmentToLon);
    } else {
      heading = heading ?? 0;
    }

    let lat = parsed.lat;
    let lon = parsed.lon;
    if (
      segmentFromLat != null &&
      segmentFromLon != null &&
      segmentToLat != null &&
      segmentToLon != null &&
      segmentProgress > 0 &&
      segmentProgress < 1
    ) {
      lat = segmentFromLat + (segmentToLat - segmentFromLat) * segmentProgress;
      lon = segmentFromLon + (segmentToLon - segmentFromLon) * segmentProgress;
    }

    trains.push({
      id: `${prediction.lineId}:${prediction.vehicleId || prediction.id}`,
      vehicleId: prediction.vehicleId || prediction.id,
      lineId: prediction.lineId,
      lineName: prediction.lineName,
      color,
      mode: prediction.modeName || 'tube',
      lat,
      lon,
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
