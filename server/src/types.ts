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

export interface ModeMetaResponse {
  displayName: string;
  baseElevation: number;
  icon: string;
}

export interface NetworkResponse {
  modes: string[];
  modeMeta: Record<string, ModeMetaResponse>;
  lines: LineFeature[];
  stations: StationFeature[];
  updatedAt: string;
}
