export function isAdminConsoleContext() {
  if (typeof document !== "undefined" && document.getElementById("admin-root")) {
    return true;
  }

  if (typeof window === "undefined") return false;

  const { hostname, pathname } = window.location;

  return (
    /(^|\/)admin(?:-|\.|\/|$)/i.test(pathname) ||
    /(^|[.-])(admin|developer|console)([.-]|$)/i.test(hostname)
  );
}
