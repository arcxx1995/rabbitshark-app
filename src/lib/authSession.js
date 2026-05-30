import { clearStoredAuthSession } from "./authStorage";
import { supabase } from "./supabaseClient";

export async function signOutOfApp() {
  clearStoredAuthSession();

  if (supabase) {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }
}
