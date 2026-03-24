// ─── Text utilities ──────────────────────────────────────────────────────────────

/**
 * Returns the singular or plural form of a word based on count.
 * @param count - The number to check
 * @param singular - The singular form
 * @param plural - The plural form (defaults to singular + "s")
 * @returns The correct form based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

/**
 * Calculates remaining votes with a minimum of 0.
 * @param used - Number of votes used
 * @param max - Maximum votes allowed
 * @returns Remaining votes (never negative)
 */
export function calculateRemainingVotes(used: number, max: number): number {
  return Math.max(0, max - used);
}
