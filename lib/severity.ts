import type { SeverityTier } from './types';

/**
 * TfL's `statusSeverity` numeric scale is not a clean, strictly-ordered 0-20
 * "worse to better" axis, so we rank by the human-readable
 * `statusSeverityDescription` instead. Lower rank = better service.
 */
const KNOWN_DESCRIPTION_RANK: Record<string, number> = {
  'good service': 0,
  'no issues': 0,
  'special service': 0,
  'change of frequency': 1,
  'minor delays': 2,
  'reduced service': 3,
  diverted: 3,
  'part closure': 4,
  'part suspended': 4,
  'severe delays': 5,
  'planned closure': 6,
  suspended: 7,
  'not running': 7,
  closed: 8,
  'service closed': 8,
};

function descriptionRank(description: string): number | undefined {
  return KNOWN_DESCRIPTION_RANK[description.trim().toLowerCase()];
}

export function rankSeverity(statusSeverityDescription: string, statusSeverity: number): number {
  const known = descriptionRank(statusSeverityDescription);
  if (known !== undefined) return known;
  return Math.max(0, 10 - statusSeverity);
}

export function rankToTier(rank: number): SeverityTier {
  if (rank <= 0) return 'good';
  if (rank <= 2) return 'minor';
  if (rank <= 5) return 'severe';
  return 'suspended';
}

export function severityTier(statusSeverityDescription: string, statusSeverity: number): SeverityTier {
  return rankToTier(rankSeverity(statusSeverityDescription, statusSeverity));
}

export function worstTier(tiers: SeverityTier[]): SeverityTier {
  const order: SeverityTier[] = ['good', 'minor', 'severe', 'suspended'];
  let worstIndex = 0;
  for (const tier of tiers) {
    const idx = order.indexOf(tier);
    if (idx > worstIndex) worstIndex = idx;
  }
  return order[worstIndex];
}

export const SEVERITY_ORDER: SeverityTier[] = ['good', 'minor', 'severe', 'suspended'];

export const SEVERITY_LABEL: Record<SeverityTier, string> = {
  good: 'Good Service',
  minor: 'Minor Delays',
  severe: 'Severe Delays',
  suspended: 'Suspended / Closed',
};

export const SEVERITY_COLOR_RGB: Record<SeverityTier, [number, number, number]> = {
  good: [34, 197, 94],
  minor: [245, 158, 11],
  severe: [249, 115, 22],
  suspended: [239, 68, 68],
};

export const SEVERITY_COLOR_HEX: Record<SeverityTier, string> = {
  good: '#22C55E',
  minor: '#F59E0B',
  severe: '#F97316',
  suspended: '#EF4444',
};

export const SEVERITY_ELEVATION_LIFT: Record<SeverityTier, number> = {
  good: 0,
  minor: 20,
  severe: 45,
  suspended: 75,
};
