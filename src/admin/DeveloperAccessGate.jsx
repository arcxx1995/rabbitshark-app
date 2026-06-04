import { useEffect, useState } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { signOutOfApp } from "../lib/authSession";
import { supabase } from "../lib/supabaseClient";

const DEVELOPER_USERS_TABLE = "developer_users";
const DEVELOPER_ACCESS_TIMEOUT_MS = 8000;

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function DeveloperAccessGate({ children }) {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function verifyDeveloperAccess() {
      if (!supabase) {
        setStatus("denied");
        setMessage("Supabase is not configured for developer access.");
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          DEVELOPER_ACCESS_TIMEOUT_MS,
          "Developer session check",
        );

        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;

        if (!user) {
          throw new Error("Sign in with a developer account to continue.");
        }

        const { data, error } = await withTimeout(
          supabase
            .from(DEVELOPER_USERS_TABLE)
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle(),
          DEVELOPER_ACCESS_TIMEOUT_MS,
          "Developer allowlist check",
        );

        if (error) throw error;

        if (!mounted) return;

        if (data?.user_id) {
          setStatus("allowed");
          return;
        }

        setStatus("denied");
        setMessage("This account is not authorized for the developer console.");
      } catch (error) {
        if (!mounted) return;

        setStatus("denied");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not verify developer access.",
        );
      }
    }

    verifyDeveloperAccess();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    try {
      await signOutOfApp();
    } catch (error) {
      console.error("Could not sign out.", error);
    } finally {
      window.location.assign("/");
    }
  }

  if (status === "checking") {
    return (
      <main className="grid min-h-dvh place-items-center bg-aurora px-5 text-green">
        <div className="section-card flex items-center gap-3 rounded-[1.5rem] p-5">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm uppercase tracking-[0.14em]">
            Verifying Developer Access
          </span>
        </div>
      </main>
    );
  }

  if (status === "allowed") return children;

  return (
    <main className="grid-shell grid min-h-dvh place-items-center bg-aurora px-5 text-green">
      <section className="section-card w-full max-w-md rounded-[1.5rem] p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/58">
            Developer Access Denied
          </p>
        </div>
        <h1 className="mt-4 text-3xl leading-[0.95] text-green">
          This console is restricted.
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/72">{message}</p>
        <Button className="mt-6 w-full" type="button" onClick={handleSignOut}>
          Sign Out
        </Button>
      </section>
    </main>
  );
}
