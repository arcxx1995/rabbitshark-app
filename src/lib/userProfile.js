import { supabase } from "./supabaseClient";

export async function syncCurrentUserProfile() {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("sync_current_user_profile");

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}
