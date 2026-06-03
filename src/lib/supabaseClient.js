import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isAdminConsoleContext() {
  if (typeof document !== "undefined" && document.getElementById("admin-root")) {
    return true;
  }

  if (typeof window !== "undefined") {
    return /(^|\/)admin(?:-|\.|\/|$)/i.test(window.location.pathname);
  }

  return false;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseAuthContext = isAdminConsoleContext() ? "admin" : "player";

export const supabase = isSupabaseConfigured
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      supabaseAuthContext === "admin"
        ? {
            auth: {
              storageKey: "rabbitshark.admin.supabase.auth",
            },
          }
        : undefined,
    )
  : null;
