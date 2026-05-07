const SESSION_STORAGE_KEY = "rabbitshark.appSession";

function readStoredSession() {
  try {
    const value = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function consumeAppSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("session");
  const userId = params.get("userId");
  const email = params.get("email");
  const name = params.get("name");

  if (!token) return readStoredSession();

  const session = {
    token,
    userId: userId ?? "user",
    email: email ?? "",
    name: name ?? "Player",
    createdAt: new Date().toISOString(),
  };

  writeStoredSession(session);
  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
}

export function signOutAppSession() {
  clearStoredSession();
}
