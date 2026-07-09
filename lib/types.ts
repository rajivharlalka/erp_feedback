/** Shape of the objects TfL's Unified API returns (trimmed to the fields we use). */

export interface TflLineStatusRaw {
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
}

export interface TflLineRaw {
  id: string;
  name: string;
  modeName: string;
  lineStatuses: TflLineStatusRaw[];
}

export interface TflMatchedStopRaw {
  id: string;
  name: string;
  lat: number;
  lon: number;
  modes: string[];
}

export interface TflRouteSequenceRaw {
  lineId: string;
  lineName: string;
  mode: string;
  lineStrings: string[];
  stations: TflMatchedStopRaw[];
}

/** Shape of the payload our own /api/network endpoint returns to the frontend. */

export type SeverityTier = 'good' | 'minor' | 'severe' | 'suspended';

export interface LineFeature {
  id: string;
  name: string;
  mode: string;
  color: string;
  statusSeverity: number;
  statusSeverityDescription: string;
  severityTier: SeverityTier;
  reason?: string;
  /** One entry per route branch/segment, each a list of [lon, lat] points. */
  paths: [number, number][][];
}

export interface StationFeature {
  id: string;
  name: string;
  lat: number;
  lon: number;
  modes: string[];
  lineIds: string[];
  worstSeverityTier: SeverityTier;
}

export interface ModeMeta {
  displayName: string;
  baseElevation: number;
  icon: string;
}

/** @deprecated Prefer ModeMeta — kept as an alias for older call sites. */
export type ModeMetaResponse = ModeMeta;

export interface NetworkResponse {
  modes: string[];
  modeMeta: Record<string, ModeMeta>;
  lines: LineFeature[];
  stations: StationFeature[];
  updatedAt: string;
}

/** Live train prediction as returned by TfL /Line/{ids}/Arrivals (trimmed). */
export interface TflPredictionRaw {
  id: string;
  vehicleId?: string;
  naptanId: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName?: string;
  direction?: string;
  destinationNaptanId?: string;
  destinationName?: string;
  timeToStation: number;
  currentLocation?: string;
  towards?: string;
  expectedArrival?: string;
  modeName?: string;
}

export interface TrainFeature {
  id: string;
  vehicleId: string;
  lineId: string;
  lineName: string;
  color: string;
  mode: string;
  lat: number;
  lon: number;
  /** Meters above the basemap — sits just above the elevated route. */
  elevation: number;
  currentLocation: string;
  towards?: string;
  direction?: string;
  destinationName?: string;
  nextStationName?: string;
  timeToNextStation?: number;
  /** When known, the segment the train is travelling along (for live glide). */
  segmentFromLat?: number;
  segmentFromLon?: number;
  segmentToLat?: number;
  segmentToLon?: number;
  /** 0 = at from-station, 1 = at to-station. */
  segmentProgress?: number;
  /** Degrees clockwise from north. */
  heading?: number;
}

export interface TrainsResponse {
  trains: TrainFeature[];
  updatedAt: string;
}
