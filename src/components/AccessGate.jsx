import { useEffect, useState } from "react";
import { AlertCircle, Mail } from "lucide-react";
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
    <main className="h-dvh overflow-y-scroll bg-aurora text-green">
      <section className="grid-shell min-h-screen overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-5 sm:px-8 sm:pb-14 sm:pt-7 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <a href="#" className="font-display text-2xl tracking-[0.18em]">
              RABBITSHARK
            </a>
            <div className="hidden rounded-full border border-green/25 bg-green px-5 py-3 text-sm font-semibold text-black shadow-tide sm:block">
              {contextLabel}
            </div>
          </header>

          <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:py-16">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/60 sm:text-sm">
                Poker Funding Evaluation
              </p>
              <h1 className="mt-4 max-w-5xl text-[3.15rem] leading-[0.9] text-green sm:text-7xl lg:text-8xl">
                Enter the Rabbitshark client area.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/74 sm:text-lg sm:leading-8">
                Sign in to continue the private operator flow, review your
                evaluation access, and complete the timed GTO challenge.
              </p>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <div className="section-card rounded-2xl p-4">
                  <p className="text-3xl">20</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/58">
                    Challenge Questions
                  </p>
                </div>
                <div className="section-card rounded-2xl p-4">
                  <p className="text-3xl">10m</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/58">
                    Evaluation Timer
                  </p>
                </div>
                <div className="section-card rounded-2xl p-4">
                  <p className="text-3xl">48+</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/58">
                    Pass Threshold
                  </p>
                </div>
              </div>
            </div>

            <section className="editorial-stage rounded-[2rem] p-4 shadow-tide sm:p-5">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/70 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                      {contextLabel}
                    </p>
                    <h2 className="mt-3 max-w-sm text-4xl leading-[0.95] text-green sm:text-5xl">
                      Sign in to {productName}.
                    </h2>
                  </div>
                  <span className="rounded-full border border-green/25 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-green">
                    Private
                  </span>
                </div>

                {status === "missing-config" ? (
                  <div className="mt-6 rounded-[1.1rem] border border-green/30 bg-green/10 p-4 text-sm leading-6 text-green">
                    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY so this app
                    can verify Supabase sessions and accept logins.
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="mt-6 flex gap-2 rounded-[1.1rem] border border-green/30 bg-green/10 p-3 text-sm leading-6 text-green">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="mt-6 rounded-[1.1rem] border border-green/30 bg-green/10 p-3 text-sm leading-6 text-green">
                    {successMessage}
                  </div>
                ) : null}

                <form className="mt-8 space-y-4" onSubmit={handleAuthSubmit}>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                      Email
                    </span>
                    <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-green">
                      <Mail className="h-4 w-4 text-white/45" />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm text-green outline-none placeholder:text-white/45"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                      Password
                    </span>
                    <div className="mt-2 h-12 rounded-xl border border-white/10 bg-white px-3 focus-within:border-green">
                      <input
                        className="password-input h-full w-full bg-transparent text-sm outline-none"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                      />
                    </div>
                  </label>

                  <Button
                    className="h-14 w-full px-6 text-sm"
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

                <p className="mt-5 text-center text-sm text-white/60">
                  {authMode === "sign-in" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    className="font-bold text-green underline-offset-4 transition hover:text-white hover:underline"
                    onClick={() => {
                      setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                  >
                    {authMode === "sign-in" ? "Create One" : "Sign In"}
                  </button>
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
