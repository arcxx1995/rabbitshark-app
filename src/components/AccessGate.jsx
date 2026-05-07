import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  clearStoredLandingSession,
  consumeLandingSessionFromUrl,
  getStoredLandingSession,
  setStoredLandingSession,
} from "../lib/landingSession";

const isLocalDeveloperPreview = import.meta.env.DEV;

function getDisplayName(user) {
  return (
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Player"
  );
}

function persistVerifiedSession({ accessToken, refreshToken, user }) {
  setStoredLandingSession({
    accessToken,
    refreshToken: refreshToken ?? "",
    userId: user.id,
    email: user.email ?? "",
    name: getDisplayName(user),
    verifiedAt: new Date().toISOString(),
  });
}

async function verifyAccessToken(accessToken) {
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw error ?? new Error("The landing page session is invalid.");
  }

  return data.user;
}

async function acceptLandingSession(session) {
  try {
    const user = await verifyAccessToken(session.accessToken);
    persistVerifiedSession({ ...session, user });
    return;
  } catch (accessTokenError) {
    if (!session.refreshToken) throw accessTokenError;
  }

  if (session.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    if (error || !data.user) {
      throw error ?? new Error("The landing page session is invalid.");
    }

    persistVerifiedSession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
    });
    return;
  }

  const user = await verifyAccessToken(session.accessToken);
  persistVerifiedSession({ ...session, user });
}

export default function AccessGate({ children }) {
  const [status, setStatus] = useState(
    isLocalDeveloperPreview ? "accepted" : "checking",
  );

  useEffect(() => {
    if (isLocalDeveloperPreview) return;

    let mounted = true;

    async function checkAccess() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("missing-config");
        return;
      }

      try {
        const redirectedSession = consumeLandingSessionFromUrl();

        if (redirectedSession) {
          await acceptLandingSession(redirectedSession);
          if (mounted) setStatus("accepted");
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          persistVerifiedSession({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            user: data.session.user,
      });
      if (mounted) setStatus("accepted");
      return;
    }

    const storedSession = getStoredLandingSession();
    if (storedSession?.accessToken) {
      const user = await verifyAccessToken(storedSession.accessToken);
      persistVerifiedSession({ ...storedSession, user });
      if (mounted) setStatus("accepted");
      return;
    }

        if (mounted) setStatus("missing-token");
      } catch (error) {
        console.error("Could not verify landing page session.", error);
        clearStoredLandingSession();
        if (mounted) setStatus("invalid-token");
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") return null;
  if (status === "accepted") return children;

  const title =
    status === "missing-config"
      ? "Supabase Config Required"
      : status === "invalid-token"
        ? "Session Rejected"
        : "Access Required";
  const message =
    status === "missing-config"
      ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY so this app can verify tokens from the landing page."
      : status === "invalid-token"
        ? "A landing page session was received, but Supabase rejected it. Log in again from the landing page."
        : "Open this app from the landing page after login so it can receive your Supabase access token.";

  return (
    <main className="grid min-h-dvh place-items-center bg-room-950 px-4 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gold-500/12 text-gold-400">
          <LockKeyhole size={24} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-black">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/58">{message}</p>
      </section>
    </main>
  );
}
