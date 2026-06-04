import { createClient } from "@supabase/supabase-js";
import { isAdminConsoleContext } from "./adminContext";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseAuthContext = isAdminConsoleContext() ? "admin" : "player";

export const supabase = isSupabaseConfigured
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          storageKey:
            supabaseAuthContext === "admin"
              ? "rabbitstake.admin.supabase.auth"
              : "rabbitstake.player.supabase.auth",
        },
      },
    )
  : null;
