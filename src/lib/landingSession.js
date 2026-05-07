const SESSION_STORAGE_KEY = "rabbitshark.landingSession";

const TOKEN_PARAM_NAMES = [
  "access_token",
  "accessToken",
  "token",
  "jwt",
  "session",
  "supabaseToken",
];
const REFRESH_TOKEN_PARAM_NAMES = ["refresh_token", "refreshToken"];

function readStoredSession() {
  try {
    const value = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function getStoredLandingSession() {
  return readStoredSession();
}

export function setStoredLandingSession(session) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function clearStoredLandingSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeBase64JsonParse(value) {
  try {
    return JSON.parse(atob(value));
  } catch {
    return null;
  }
}

function normalizeSessionValue(value) {
  const parsed = safeJsonParse(value) ?? safeBase64JsonParse(value);

  if (!parsed || typeof parsed !== "object") return null;

  return {
    accessToken:
      parsed.access_token ??
      parsed.accessToken ??
      parsed.session?.access_token ??
      parsed.session?.accessToken ??
      null,
    refreshToken:
      parsed.refresh_token ??
      parsed.refreshToken ??
      parsed.session?.refresh_token ??
      parsed.session?.refreshToken ??
      null,
  };
}

function getRefreshTokenFromParams(params) {
  const tokenName = REFRESH_TOKEN_PARAM_NAMES.find((name) => params.get(name));
  return tokenName ? params.get(tokenName) : null;
}

function getTokenFromParams(params) {
  const tokenName = TOKEN_PARAM_NAMES.find((name) => params.get(name));

  if (!tokenName) return null;

  const value = params.get(tokenName);
  const parsedSession = normalizeSessionValue(value);

  if (parsedSession?.accessToken) {
    return {
      accessToken: parsedSession.accessToken,
      refreshToken: parsedSession.refreshToken ?? getRefreshTokenFromParams(params),
    };
  }

  return {
    accessToken: value,
    refreshToken: getRefreshTokenFromParams(params),
  };
}

function removeSessionParams(url) {
  TOKEN_PARAM_NAMES.forEach((name) => url.searchParams.delete(name));
  REFRESH_TOKEN_PARAM_NAMES.forEach((name) => url.searchParams.delete(name));

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  TOKEN_PARAM_NAMES.forEach((name) => hashParams.delete(name));
  REFRESH_TOKEN_PARAM_NAMES.forEach((name) => hashParams.delete(name));
  url.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
}

export function consumeLandingSessionFromUrl() {
  const url = new URL(window.location.href);
  const querySession = getTokenFromParams(url.searchParams);
  const hashSession = getTokenFromParams(new URLSearchParams(url.hash.replace(/^#/, "")));
  const session = querySession ?? hashSession;

  if (!session?.accessToken) return null;

  removeSessionParams(url);
  window.history.replaceState({}, document.title, url.toString());

  return session;
}
