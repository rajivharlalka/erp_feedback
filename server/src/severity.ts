import { SeverityTier } from './types.js';

/**
 * TfL's `statusSeverity` numeric scale is not a clean, strictly-ordered 0-20
 * "worse to better" axis (its own /Line/Meta/Severity legend mixes unrelated
 * concepts like "No Step Free Access" and "Exit Only" into the same list), so
 * we rank by the human-readable `statusSeverityDescription` instead - that's
 * what's actually shown to Tube customers and what we observed in the live
 * feed. Lower rank = better service.
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

/**
 * Resolves a rank (0 = best, higher = worse) for a status. Falls back to the
 * numeric `statusSeverity` for any description TfL introduces that we haven't
 * seen yet, based on the pattern observed live (10 = Good Service, lower
 * numbers = progressively worse).
 */
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

/** Combines multiple tiers, returning whichever represents the worst service. */
export function worstTier(tiers: SeverityTier[]): SeverityTier {
  const order: SeverityTier[] = ['good', 'minor', 'severe', 'suspended'];
  let worstIndex = 0;
  for (const tier of tiers) {
    const idx = order.indexOf(tier);
    if (idx > worstIndex) worstIndex = idx;
  }
  return order[worstIndex];
}
