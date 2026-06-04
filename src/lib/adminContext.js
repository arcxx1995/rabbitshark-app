export function isAdminConsoleContext() {
  if (typeof document !== "undefined" && document.getElementById("admin-root")) {
    return true;
  }

  if (import.meta.env.VITE_RABBITSHARK_APP_CONTEXT === "admin") {
    return true;
  }

  if (typeof window === "undefined") return false;

  const { pathname } = window.location;

  return /(^|\/)admin(?:-|\.|\/|$)/i.test(pathname);
}
