import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { consumeAppSessionFromUrl } from "../lib/appSession";

const loginUrl = import.meta.env.VITE_LOGIN_URL ?? "http://localhost:3000/login";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setSession(consumeAppSessionFromUrl());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-room-950 px-4 text-white">
        <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gold-500/12 text-gold-400">
            <LockKeyhole size={24} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-black">
            Login Required
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Log in from Rabbitshark to open your player dashboard.
          </p>
          <a
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-5 text-sm font-bold uppercase tracking-[0.14em] text-room-950"
            href={loginUrl}
          >
            Go To Login
          </a>
        </section>
      </main>
    );
  }

  return children;
}
