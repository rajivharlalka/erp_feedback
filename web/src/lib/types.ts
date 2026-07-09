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

export interface NetworkResponse {
  modes: string[];
  modeMeta: Record<string, ModeMeta>;
  lines: LineFeature[];
  stations: StationFeature[];
  updatedAt: string;
}
