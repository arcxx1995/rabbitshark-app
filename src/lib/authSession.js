import { clearStoredAuthSession } from "./authStorage";
import { clearPersistedChallengeState } from "./challengeStateStorage";
import { supabase, supabaseAuthContext } from "./supabaseClient";

export async function signOutOfApp() {
  clearStoredAuthSession();

  if (supabaseAuthContext === "player") {
    clearPersistedChallengeState();
  }

  if (supabase) {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }
}
