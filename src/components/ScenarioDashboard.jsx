import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Play,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Target,
} from "lucide-react";
import ScorePanel from "./ScorePanel";
import { clearStoredLandingSession } from "../lib/landingSession";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useEvaluationStore } from "../store/useEvaluationStore";

const landingPageUrl = import.meta.env.VITE_LANDING_PAGE_URL;

function getLogoutRedirectUrl() {
  if (landingPageUrl) return landingPageUrl;

  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      const current = new URL(window.location.href);

      if (referrer.origin !== current.origin) {
        return referrer.toString();
      }
    } catch {
      // Ignore malformed referrer values and use the local fallback.
    }
  }

  return "/";
}

export default function ScenarioDashboard() {
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const startEvaluation = useEvaluationStore((state) => state.startEvaluation);
  const resetEvaluation = useEvaluationStore((state) => state.resetEvaluation);
  const purchaseChallenge = useEvaluationStore((state) => state.purchaseChallenge);
  const currentChallenge = useEvaluationStore((state) => state.currentChallenge);
  const pastChallenges = useEvaluationStore((state) => state.pastChallenges);
  const isLoadingData = useEvaluationStore((state) => state.isLoadingData);
  const stats = useEvaluationStore((state) => state.stats);
  const average = useEvaluationStore((state) => state.getAverageScore());
  const totalPossible = useEvaluationStore((state) => state.getTotalPossibleScore());
  const fundedThresholdPoints = useEvaluationStore((state) =>
    state.getFundedThresholdPoints(),
  );
  const fundedThresholdPercent = useEvaluationStore((state) =>
    state.getFundedThresholdPercent(),
  );
  const completedCount = stats.completedScenarios.length;
  const hasCurrentChallenge = Boolean(currentChallenge);
  const status = !hasCurrentChallenge
    ? "Not purchased"
    : completedCount === 0
      ? currentChallenge.status
      : completedCount === 25
        ? "Complete"
        : "In progress";

  const metrics = [
    {
      label: "Evaluation Status",
      value: status,
      detail: `${completedCount}/25 complete`,
      icon: ClipboardList,
    },
    {
      label: "Score",
      value: `${average}%`,
      detail: `${stats.totalScore}/${totalPossible} pts`,
      icon: BarChart3,
    },
    {
      label: "Funded Target",
      value: `${fundedThresholdPoints} pts`,
      detail: `${fundedThresholdPercent}% threshold`,
      icon: Target,
    },
  ];
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "evaluation", label: "Evaluation", icon: ClipboardList },
    { id: "results", label: "Results", icon: BarChart3 },
    { id: "funding", label: "Funding", icon: ShieldCheck },
  ];
  const screenTitle = navItems.find((item) => item.id === activeScreen)?.label;
  const logout = () => {
    clearStoredLandingSession();
    window.location.assign(getLogoutRedirectUrl());
  };

  return (
    <main className="h-dvh overflow-hidden bg-room-950 px-3 py-3 text-white sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto grid h-full max-w-[1500px] gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-0 rounded-xl border border-white/10 bg-white/[0.04] p-3 lg:flex lg:flex-col">
          <div>
            <div className="px-2 py-3">
              <div className="font-display text-lg font-black tracking-tight">
                Rabbitshark
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                Player Console
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-300/25 bg-red-500/12 px-3 text-xs font-bold uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-500/20 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
            <nav className="mt-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveScreen(item.id)}
                    className={[
                      "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition",
                      activeScreen === item.id
                        ? "bg-gold-500 text-room-950"
                        : "text-white/58 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto rounded-lg border border-white/10 bg-black/18 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">
              Status
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={["h-2 w-2 rounded-full", hasCurrentChallenge ? "bg-felt-500" : "bg-gold-400"].join(" ")} />
              <span className="text-sm font-bold text-white/72">{status}</span>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-4">
          <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-felt-500/45 text-felt-500">
                  Evaluation
                </Badge>
                <Badge>No real-money play</Badge>
                {isLoadingData ? <Badge>Loading data</Badge> : null}
              </div>
              <h1 className="mt-3 font-display text-2xl font-black tracking-tight sm:text-3xl">
                {screenTitle}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              {hasCurrentChallenge ? (
                <Button className="h-10 px-4 text-xs" onClick={() => startEvaluation("All")}>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
              ) : (
                <Button className="h-10 px-4 text-xs" onClick={purchaseChallenge}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Challenge
                </Button>
              )}
              <Button
                className="h-10 px-4 text-xs"
                variant="secondary"
                onClick={resetEvaluation}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                className="h-10 px-4 text-xs"
                variant="danger"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </div>
          </header>

          <section className="grid shrink-0 gap-3 md:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label} className="rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">
                        {metric.label}
                      </p>
                      <div className="mt-2 font-display text-2xl font-black">
                        {metric.value}
                      </div>
                      <p className="mt-1 text-sm text-white/52">{metric.detail}</p>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold-500/12 text-gold-400">
                      <Icon size={20} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_340px]">
          <motion.div
            className="grid min-h-0 gap-4 lg:grid-rows-[1fr_auto]"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Card className="flex min-h-0 flex-col justify-between rounded-xl p-5 sm:p-6">
              {activeScreen === "dashboard" ? (
                <>
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl sm:text-3xl">
                          {currentChallenge ? currentChallenge.title : "Challenge Access Required"}
                        </CardTitle>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                          {currentChallenge
                            ? "Your active challenge is ready on the dashboard. Start the assessment and complete 25 decision points to qualify for funding."
                            : "Buy a challenge to unlock the active assessment on your dashboard."}
                        </p>
                      </div>
                      <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-felt-500/12 text-felt-500 sm:grid">
                        {currentChallenge ? <ShieldCheck size={24} /> : <ShoppingCart size={24} />}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {(currentChallenge
                        ? [
                            ["Status", currentChallenge.status, "Current challenge"],
                            ["Progress", `${completedCount}/25`, "Questions complete"],
                            ["Target", `${fundedThresholdPoints} pts`, "Funded milestone"],
                          ]
                        : [
                            ["Access", "Required", "Challenge status"],
                            ["Questions", "25", "Included in challenge"],
                            ["Target", `${fundedThresholdPoints} pts`, "Funded milestone"],
                          ]
                      ).map(([label, value, detail]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-white/10 bg-black/20 p-4"
                        >
                          <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">
                            {label}
                          </div>
                          <div className="mt-2 font-display text-2xl font-black text-gold-400">
                            {value}
                          </div>
                          <div className="mt-1 text-xs text-white/45">{detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
                    {hasCurrentChallenge ? (
                      <Button
                        className="h-11 sm:h-12"
                        size="lg"
                        onClick={() => startEvaluation("All")}
                      >
                        <Play className="mr-2 h-5 w-5" />
                        Start Challenge
                      </Button>
                    ) : (
                      <Button className="h-11 sm:h-12" size="lg" onClick={purchaseChallenge}>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Buy Challenge
                      </Button>
                    )}
                    <Button
                      className="h-11 sm:h-12"
                      size="lg"
                      variant="secondary"
                      onClick={() => setActiveScreen("funding")}
                    >
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Funding Details
                    </Button>
                  </div>
                </>
              ) : activeScreen === "evaluation" ? (
                <div className="min-h-[360px]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl sm:text-3xl">
                        Past Challenges
                      </CardTitle>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                        Completed challenge history appears here after each
                        assessment is submitted.
                      </p>
                    </div>
                    <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-500/12 text-gold-400 sm:grid">
                      <ClipboardList size={24} />
                    </div>
                  </div>

                  {pastChallenges.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-white/12 bg-black/14 p-6 text-sm text-white/48">
                      No past challenges yet.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {pastChallenges.map((challenge) => (
                        <div
                          key={challenge.id}
                          className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 sm:grid-cols-[1fr_auto_auto]"
                        >
                          <div>
                            <div className="font-display text-lg font-bold">
                              {challenge.title}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                              Completed {new Date(challenge.completedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-white/70">
                            {challenge.earnedPoints}/{challenge.totalPossiblePoints} pts
                          </div>
                          <Badge className={challenge.funded ? "border-felt-500/45 text-felt-500" : "text-white/60"}>
                            {challenge.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[360px]" />
              )}
            </Card>

            {activeScreen === "dashboard" ? (
              <Card className="rounded-xl p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  hasCurrentChallenge
                    ? ["1", "Start evaluation"]
                    : ["1", "Buy challenge"],
                  ["2", "Play decision points"],
                  ["3", "Reach funded milestone"],
                ].map(([step, label]) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/8 font-display text-sm font-black text-gold-400">
                      {step}
                    </div>
                    <div className="text-sm font-bold text-white/72">{label}</div>
                  </div>
                ))}
              </div>
              </Card>
            ) : null}
          </motion.div>

          <aside className="hidden min-h-0 space-y-3 overflow-hidden lg:block">
            <ScorePanel compact />
            <Card className="rounded-xl p-4">
              <CardHeader className="mb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-felt-500" />
                  Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                  <span className="text-sm text-white/58">Evaluation</span>
                  <span className="font-display text-sm font-bold">25 questions</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                  <span className="text-sm text-white/58">Funded</span>
                  <span className="font-display text-sm font-bold">
                    {fundedThresholdPoints} pts
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                  <span className="text-sm text-white/58">Maximum</span>
                  <span className="font-display text-sm font-bold">
                    {totalPossible} pts
                  </span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
        </div>
      </div>
    </main>
  );
}
