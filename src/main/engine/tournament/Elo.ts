/**
 * Elo rating utilities for the Ranking agent's tournament.
 * New hypotheses start at 1200 (matching the paper).
 */
export const INITIAL_ELO = 1200

const K_FACTOR = 32

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Returns the new ratings after a match. `scoreA` is 1 if A won, 0 if A lost.
 */
export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number
): { newA: number; newB: number; delta: number } {
  const expA = expectedScore(ratingA, ratingB)
  const expB = expectedScore(ratingB, ratingA)
  const newA = ratingA + K_FACTOR * (scoreA - expA)
  const newB = ratingB + K_FACTOR * (1 - scoreA - expB)
  return {
    newA: Math.round(newA),
    newB: Math.round(newB),
    delta: Math.round(Math.abs(newA - ratingA))
  }
}
