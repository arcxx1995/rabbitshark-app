import { clearStoredAuthSession } from "./authStorage";
import { clearPersistedChallengeState } from "./challengeStateStorage";
import { supabase, supabaseAuthContext } from "./supabaseClient";
import { useEvaluationStore } from "../store/useEvaluationStore";

export async function signOutOfApp() {
  clearStoredAuthSession();

  if (supabaseAuthContext === "player") {
    clearPersistedChallengeState();
    useEvaluationStore.getState().resetChallengeStateForUser(null);
  }

  if (supabase) {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }
}
