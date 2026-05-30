import { useEffect, useState } from "react";
import { AlertCircle, LockKeyhole, Mail } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  clearStoredAuthSession,
  setStoredAuthSession,
} from "../lib/authStorage";
import { Button } from "./ui/button";

function getDisplayName(user) {
  return (
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Player"
  );
}

function persistVerifiedSession({ accessToken, refreshToken, user }) {
  setStoredAuthSession({
    accessToken,
    refreshToken: refreshToken ?? "",
    userId: user.id,
    email: user.email ?? "",
    name: getDisplayName(user),
    verifiedAt: new Date().toISOString(),
  });
}

export default function AccessGate({
  children,
  productName = "Rabbitshark",
  contextLabel = "Player Console",
}) {
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setStatus("missing-config");
      return;
    }

    let mounted = true;

    async function checkAccess() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session?.user) {
          persistVerifiedSession({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            user: data.session.user,
          });
          if (mounted) setStatus("accepted");
          return;
        }

        if (mounted) setStatus("ready");
      } catch (error) {
        console.error("Could not verify browser session.", error);
        clearStoredAuthSession();
        if (mounted) {
          setErrorMessage(
            "Your saved browser session was rejected. Sign in again to continue.",
          );
          setStatus("ready");
        }
      }
    }

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        persistVerifiedSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          user: session.user,
        });
        setStatus("accepted");
        return;
      }

      if (event === "SIGNED_OUT") {
        clearStoredAuthSession();
        setStatus("ready");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable login.",
      );
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const trimmedEmail = email.trim();
      const { data, error } =
        authMode === "sign-up"
          ? await supabase.auth.signUp({
              email: trimmedEmail,
              password,
            })
          : await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });

      if (error) throw error;

      if (authMode === "sign-up" && !data.session) {
        setSuccessMessage(
          "Account created. Check your email to confirm it, then sign in.",
        );
        setAuthMode("sign-in");
        setPassword("");
        return;
      }

      if (!data.session?.user) {
        throw new Error(
          authMode === "sign-up"
            ? "Could not create an account with those credentials."
            : "Could not sign in with those credentials.",
        );
      }

      persistVerifiedSession({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: data.session.user,
      });
      setStatus("accepted");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : authMode === "sign-up"
            ? "Could not create an account with those credentials."
            : "Could not sign in with those credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "checking") return null;
  if (status === "accepted") return children;

  return (
    <main className="grid min-h-dvh place-items-center bg-room-950 px-4 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gold-500/12 text-gold-400">
          <LockKeyhole size={24} />
        </div>
        <div className="mt-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">
            {contextLabel}
          </div>
          <h1 className="mt-2 font-display text-2xl font-black">
            Sign in to {productName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Use your account credentials. This browser will keep the session
            until you log out.
          </p>
        </div>

        {status === "missing-config" ? (
          <div className="mt-5 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY so this app can
            verify Supabase sessions and accept logins.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 flex gap-2 rounded-lg border border-red-300/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-lg border border-felt-500/30 bg-felt-500/10 p-3 text-sm leading-6 text-felt-500">
            {successMessage}
          </div>
        ) : null}

        <form
          className="mt-6 space-y-4"
          onSubmit={handleAuthSubmit}
        >
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/42">
              Email
            </span>
            <div className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-black/22 px-3 focus-within:border-gold-400/60">
              <Mail className="h-4 w-4 text-white/35" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/42">
              Password
            </span>
            <div className="mt-2 h-12 rounded-lg border border-white/10 bg-black/22 px-3 focus-within:border-gold-400/60">
              <input
                className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
            </div>
          </label>

          <Button
            className="h-11 w-full px-4 text-xs"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? authMode === "sign-up"
                ? "Creating Account"
                : "Signing In"
              : authMode === "sign-up"
                ? "Create Account"
                : "Sign In"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-white/55">
          {authMode === "sign-in" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="font-bold text-gold-400 underline-offset-4 hover:text-gold-300 hover:underline"
            onClick={() => {
              setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
              setErrorMessage("");
              setSuccessMessage("");
            }}
          >
            {authMode === "sign-in" ? "Create One" : "Sign In"}
          </button>
        </p>
      </section>
    </main>
  );
}
