import type { SeverityTier } from './types';

export const SEVERITY_ORDER: SeverityTier[] = ['good', 'minor', 'severe', 'suspended'];

export const SEVERITY_LABEL: Record<SeverityTier, string> = {
  good: 'Good Service',
  minor: 'Minor Delays',
  severe: 'Severe Delays',
  suspended: 'Suspended / Closed',
};

/** RGB tuples (deck.gl colors, no alpha) - kept in sync with the CSS palette below. */
export const SEVERITY_COLOR_RGB: Record<SeverityTier, [number, number, number]> = {
  good: [34, 197, 94], // green-500
  minor: [245, 158, 11], // amber-500
  severe: [249, 115, 22], // orange-500
  suspended: [239, 68, 68], // red-500
};

export const SEVERITY_COLOR_HEX: Record<SeverityTier, string> = {
  good: '#22C55E',
  minor: '#F59E0B',
  severe: '#F97316',
  suspended: '#EF4444',
};

/**
 * Extra height (meters) added on top of a mode's base elevation, so disrupted
 * lines/stations visibly "float" higher above the map - a literal 3D plot of
 * live service health.
 */
export const SEVERITY_ELEVATION_LIFT: Record<SeverityTier, number> = {
  good: 0,
  minor: 20,
  severe: 45,
  suspended: 75,
};
