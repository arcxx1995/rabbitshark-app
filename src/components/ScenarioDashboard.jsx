import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Play,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  XCircle,
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

const formatDate = (value) => {
  if (!value) return "Not started";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function ChallengeScoreRows({ challenge }) {
  const scenarioResults = challenge.scenarioResults ?? [];

  if (scenarioResults.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/12 bg-black/14 p-4 text-sm text-white/45">
        Score details will appear here for newly completed challenges.
      </div>
    );
  }

  return (
    <div className="grid max-h-64 gap-2 overflow-auto pr-1 sm:grid-cols-2">
      {scenarioResults.map((scenario) => (
        <div key={scenario.id} className="rounded-lg bg-black/22 p-3">
          <div className="truncate text-sm font-bold text-white/78">
            {scenario.title}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-white/45">{scenario.selectedAction}</span>
            <span className="font-display text-sm font-black text-gold-400">
              {scenario.points}/{scenario.maxPoints}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentPage({
  fundedThresholdPercent,
  fundedThresholdPoints,
  onApprove,
  onCancel,
  onFail,
}) {
  return (
    <main className="grid min-h-dvh bg-room-950 px-3 py-3 text-white sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col justify-center">
        <div className="mb-5">
          <Badge className="border-gold-400/45 text-gold-400">
            Temporary Checkout
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl">
            Purchase Challenge
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">
            This separate payment page simulates the upcoming checkout. Approval
            creates an active challenge bucket; failure returns to the dashboard
            without adding a challenge.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Funding Challenge</CardTitle>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                  Unlock one active challenge bucket with 25 decision points,
                  score tracking, and funded-threshold results.
                </p>
              </div>
              <div className="rounded-lg bg-gold-500/12 px-4 py-3 text-right">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/42">
                  Test Price
                </div>
                <div className="mt-1 font-display text-3xl font-black text-gold-400">
                  $99
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Questions", "25"],
                ["Funded Target", `${fundedThresholdPoints} pts`],
                ["Threshold", `${fundedThresholdPercent}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-black/22 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                    {label}
                  </div>
                  <div className="mt-2 font-display text-xl font-black text-gold-400">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold-500/12 text-gold-400">
              <CreditCard size={24} />
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-white/42">
              Temporary Controls
            </div>
            <div className="mt-4 space-y-3">
              <Button className="h-11 w-full px-4 text-xs" onClick={onApprove}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Payment
              </Button>
              <Button
                className="h-11 w-full px-4 text-xs"
                variant="danger"
                onClick={onFail}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Failed
              </Button>
              <Button
                className="h-11 w-full px-4 text-xs"
                variant="secondary"
                onClick={onCancel}
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function ScenarioDashboard() {
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [expandedChallengeId, setExpandedChallengeId] = useState(null);
  const startEvaluation = useEvaluationStore((state) => state.startEvaluation);
  const resetEvaluation = useEvaluationStore((state) => state.resetEvaluation);
  const purchaseChallenge = useEvaluationStore((state) => state.purchaseChallenge);
  const currentChallenge = useEvaluationStore((state) => state.currentChallenge);
  const storedActiveChallenges = useEvaluationStore((state) => state.activeChallenges);
  const pastChallenges = useEvaluationStore((state) => state.pastChallenges);
  const isLoadingData = useEvaluationStore((state) => state.isLoadingData);
  const stats = useEvaluationStore((state) => state.stats);
  const totalPossible = useEvaluationStore((state) => state.getTotalPossibleScore());
  const fundedThresholdPoints = useEvaluationStore((state) =>
    state.getFundedThresholdPoints(),
  );
  const fundedThresholdPercent = useEvaluationStore((state) =>
    state.getFundedThresholdPercent(),
  );
  const completedCount = stats.completedScenarios.length;
  const activeChallenges =
    storedActiveChallenges.length > 0
      ? storedActiveChallenges
      : currentChallenge
        ? [currentChallenge]
        : [];
  const hasCurrentChallenge = activeChallenges.length > 0;
  const failedChallenges = pastChallenges.filter(
    (challenge) => challenge.status === "Failed" || !challenge.funded,
  );
  const fundedChallenges = pastChallenges.filter((challenge) => challenge.funded);
  const status = !hasCurrentChallenge
    ? "No active challenge"
    : currentChallenge && completedCount === 0
      ? currentChallenge.status
      : currentChallenge && completedCount === 25
        ? "Complete"
        : currentChallenge
          ? "In progress"
          : "Ready";

  const metrics = [
    {
      label: "Active Challenges",
      value: activeChallenges.length,
      detail: hasCurrentChallenge ? status : "Purchase to begin",
      icon: Trophy,
    },
    {
      label: "Failed Challenges",
      value: failedChallenges.length,
      detail: `${fundedChallenges.length} funded`,
      icon: XCircle,
    },
    {
      label: "Past Challenges",
      value: pastChallenges.length,
      detail: `${fundedChallenges.length} funded`,
      icon: ClipboardList,
    },
  ];
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "evaluation", label: "Challenges", icon: ClipboardList },
    { id: "results", label: "Results", icon: BarChart3 },
    { id: "funding", label: "Funding", icon: ShieldCheck },
  ];
  const screenTitle =
    activeScreen === "payments"
      ? "Payments"
      : navItems.find((item) => item.id === activeScreen)?.label;
  const openPayments = () => {
    setActiveScreen("payments");
  };
  const approvePayment = async () => {
    await purchaseChallenge();
    setActiveScreen("dashboard");
  };
  const failPayment = () => {
    setActiveScreen("dashboard");
  };
  const logout = () => {
    clearStoredLandingSession();
    window.location.assign(getLogoutRedirectUrl());
  };

  if (activeScreen === "payments") {
    return (
      <PaymentPage
        fundedThresholdPercent={fundedThresholdPercent}
        fundedThresholdPoints={fundedThresholdPoints}
        onApprove={approvePayment}
        onCancel={() => setActiveScreen("dashboard")}
        onFail={failPayment}
      />
    );
  }

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
              Active Status
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  hasCurrentChallenge ? "bg-felt-500" : "bg-gold-400",
                ].join(" ")}
              />
              <span className="text-sm font-bold text-white/72">{status}</span>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-4">
          <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-felt-500/45 text-felt-500">
                  Challenge Dashboard
                </Badge>
                <Badge>No real-money play</Badge>
                {isLoadingData ? <Badge>Loading data</Badge> : null}
              </div>
              <h1 className="mt-3 font-display text-2xl font-black tracking-tight sm:text-3xl">
                {screenTitle}
              </h1>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {hasCurrentChallenge ? (
                <Button className="h-10 px-4 text-xs" onClick={() => startEvaluation("All")}>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
              ) : (
                <Button className="h-10 px-4 text-xs" onClick={openPayments}>
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
              <Button className="h-10 px-4 text-xs" variant="danger" onClick={logout}>
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
              className="min-h-0"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <Card className="flex min-h-0 flex-col rounded-xl p-5 sm:p-6">
                {activeScreen === "dashboard" ? (
                  <div className="min-h-0 overflow-auto pr-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl sm:text-3xl">
                          Challenge Overview
                        </CardTitle>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                          Active challenge buckets stay here. Use the plus button
                          to open the temporary payment page before adding another
                          purchased challenge.
                        </p>
                      </div>
                      <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-felt-500/12 text-felt-500 sm:grid">
                        <LayoutDashboard size={24} />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-display text-lg font-bold">
                          Active Challenges
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge>{activeChallenges.length} active</Badge>
                          <button
                            type="button"
                            onClick={openPayments}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-gold-400/35 bg-gold-500/12 text-gold-400 transition hover:bg-gold-500/20 hover:text-gold-300"
                            aria-label="Add challenge"
                            title="Add challenge"
                          >
                            <PlusCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      {activeChallenges.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/12 bg-black/14 p-5">
                          <div className="font-display text-lg font-bold text-white/80">
                            No active challenge
                          </div>
                          <p className="mt-2 text-sm text-white/50">
                            Purchase a challenge to add it to this dashboard.
                          </p>
                          <Button className="mt-4 h-10 px-4 text-xs" onClick={openPayments}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Buy Challenge
                          </Button>
                        </div>
                      ) : (
                        <div className="grid max-h-[48vh] gap-3 overflow-auto pr-1 md:grid-cols-2">
                          {activeChallenges.map((challenge, index) => {
                            const isCurrentChallenge =
                              currentChallenge?.id === challenge.id;
                            const progressCount = isCurrentChallenge ? completedCount : 0;
                            const currentPoints = isCurrentChallenge
                              ? stats.totalScore
                              : challenge.earnedPoints;
                            const challengeStatus = isCurrentChallenge
                              ? status
                              : challenge.status;

                            return (
                            <div
                              key={challenge.id}
                              className="rounded-lg border border-felt-500/25 bg-felt-900/18 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-display text-lg font-bold">
                                    {challenge.title} #{index + 1}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Purchased {formatDate(challenge.purchasedAt)}
                                  </div>
                                </div>
                                <Badge className="border-felt-500/45 text-felt-500">
                                  {challengeStatus}
                                </Badge>
                              </div>
                              <div className="mt-4 grid grid-cols-3 gap-2">
                                {[
                                  ["Progress", `${progressCount}/25`],
                                  ["Current", `${currentPoints} pts`],
                                  ["Target", `${fundedThresholdPoints} pts`],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-lg bg-black/22 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      {label}
                                    </div>
                                    <div className="mt-1 font-display text-lg font-black text-gold-400">
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Button
                                className="mt-4 h-10 w-full px-4 text-xs"
                                onClick={() => startEvaluation("All", challenge.id)}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Continue Challenge
                              </Button>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeScreen === "evaluation" ? (
                  <div className="min-h-[360px] overflow-auto pr-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl sm:text-3xl">
                          Past Challenge Buckets
                        </CardTitle>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                          Review completed challenge outcomes and expand each bucket
                          for scored decision points.
                        </p>
                      </div>
                      <Badge>{pastChallenges.length} complete</Badge>
                    </div>
                    <div className="mt-6 grid gap-3">
                      {pastChallenges.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/12 bg-black/14 p-6 text-sm text-white/48">
                          No past challenges yet.
                        </div>
                      ) : (
                        pastChallenges.map((challenge) => {
                          const expanded = expandedChallengeId === challenge.id;

                          return (
                          <div
                            key={challenge.id}
                            className="rounded-lg border border-white/10 bg-black/20 p-4"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedChallengeId(expanded ? null : challenge.id)
                              }
                              className="flex w-full items-center justify-between gap-4 text-left"
                            >
                              <div>
                                <div className="font-display text-lg font-bold">
                                  {challenge.title}
                                </div>
                                <div className="mt-1 text-xs text-white/45">
                                  Completed {formatDate(challenge.completedAt)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-display text-xl font-black text-gold-400">
                                    {challenge.score}%
                                  </div>
                                  <div className="text-xs text-white/45">
                                    {challenge.earnedPoints}/{challenge.totalPossiblePoints} pts
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    challenge.funded
                                      ? "border-felt-500/45 text-felt-500"
                                      : "border-red-300/30 text-red-100"
                                  }
                                >
                                  {challenge.status}
                                </Badge>
                                <ChevronDown
                                  className={[
                                    "h-5 w-5 text-white/45 transition",
                                    expanded ? "rotate-180" : "",
                                  ].join(" ")}
                                />
                              </div>
                            </button>
                            {expanded ? (
                              <div className="mt-4 border-t border-white/10 pt-4">
                                <ChallengeScoreRows challenge={challenge} />
                              </div>
                            ) : null}
                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-white/12 bg-black/14 p-6 text-center">
                    <div>
                      <CardTitle>{screenTitle}</CardTitle>
                      <p className="mt-2 text-sm text-white/48">
                        Dashboard challenge data remains available from the main view.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
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
                    <span className="text-sm text-white/58">Challenge</span>
                    <span className="font-display text-sm font-bold">25 questions</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className="text-sm text-white/58">Funded</span>
                    <span className="font-display text-sm font-bold">
                      {fundedThresholdPoints} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className="text-sm text-white/58">Threshold</span>
                    <span className="font-display text-sm font-bold">
                      {fundedThresholdPercent}%
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
