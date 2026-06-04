export const PLAYER_CHALLENGE_STATE_STORAGE_KEY = "rabbitstake.challengeState";

export function clearPersistedChallengeState() {
  try {
    window.localStorage.removeItem(PLAYER_CHALLENGE_STATE_STORAGE_KEY);
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}
