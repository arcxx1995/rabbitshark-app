import { isAdminConsoleContext } from "./adminContext";

const PLAYER_SESSION_STORAGE_KEY = "rabbitshark.authSession";
const ADMIN_SESSION_STORAGE_KEY = "rabbitshark.adminAuthSession";
const LEGACY_SESSION_STORAGE_KEY = "rabbitshark.landingSession";

function getSessionStorageKey() {
  return isAdminConsoleContext() ? ADMIN_SESSION_STORAGE_KEY : PLAYER_SESSION_STORAGE_KEY;
}

export function setStoredAuthSession(session) {
  try {
    window.localStorage.setItem(getSessionStorageKey(), JSON.stringify(session));
    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function clearStoredAuthSession() {
  try {
    window.localStorage.removeItem(getSessionStorageKey());
    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
