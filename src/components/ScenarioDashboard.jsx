import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Trophy,
  XCircle,
} from "lucide-react";
import ScorePanel from "./ScorePanel";
import { signOutOfApp } from "../lib/authSession";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent } from "./ui/dialog";
import { useEvaluationStore } from "../store/useEvaluationStore";

const formatDate = (value) => {
  if (!value) return "Not started";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ScenarioDashboard() {
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [pendingChallengeStart, setPendingChallengeStart] = useState(null);
  const initializeData = useEvaluationStore((state) => state.initializeData);
  const startEvaluation = useEvaluationStore((state) => state.startEvaluation);
  const currentChallenge = useEvaluationStore((state) => state.currentChallenge);
  const storedActiveChallenges = useEvaluationStore((state) => state.activeChallenges);
  const pastChallenges = useEvaluationStore((state) => state.pastChallenges);
  const isLoadingData = useEvaluationStore((state) => state.isLoadingData);
  const challengeDataError = useEvaluationStore((state) => state.challengeDataError);
  const challengeDataUser = useEvaluationStore((state) => state.challengeDataUser);
  const lastChallengeSyncAt = useEvaluationStore((state) => state.lastChallengeSyncAt);
  const lastActiveChallengeCount = useEvaluationStore(
    (state) => state.lastActiveChallengeCount,
  );
  const stats = useEvaluationStore((state) => state.stats);
  const totalPossible = useEvaluationStore((state) => state.getTotalPossibleScore());
  const fundedThresholdPoints = useEvaluationStore((state) =>
    state.getFundedThresholdPoints(),
  );
  const fundedThresholdPercent = useEvaluationStore((state) =>
    state.getFundedThresholdPercent(),
  );
  const completedCount = stats.completedScenarios.length;
  const activeQuestionCount =
    currentChallenge?.evaluation?.questionCount ??
    currentChallenge?.evaluation?.questions?.length ??
    25;
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
      : currentChallenge && completedCount === activeQuestionCount
        ? "Complete"
        : currentChallenge
          ? "In progress"
          : "Ready";

  const metrics = [
    {
      label: "Active Challenges",
      value: activeChallenges.length,
      detail: hasCurrentChallenge ? status : "Awaiting assignment",
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
  const logout = async () => {
    try {
      await signOutOfApp();
    } catch (error) {
      console.error("Could not sign out.", error);
    } finally {
      window.location.assign("/");
    }
  };
  const requestChallengeStart = (challengeId) => {
    setPendingChallengeStart({ category: "All", challengeId });
  };
  const startChallengeFromDashboard = (challenge) => {
    if (!challenge) return;

    requestChallengeStart(challenge.id);
  };
  const closeStartGate = () => {
    setActiveScreen("dashboard");
    setPendingChallengeStart(null);
  };
  const confirmChallengeStart = () => {
    const pendingStart = pendingChallengeStart;
    setPendingChallengeStart(null);
    startEvaluation(pendingStart?.category ?? "All", pendingStart?.challengeId);
  };

  return (
    <main className="h-dvh overflow-hidden bg-aurora text-green">
      <section className="grid-shell h-full px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto grid h-full max-w-[1500px] gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="section-card hidden min-h-0 rounded-[1.5rem] p-3 lg:flex lg:flex-col">
          <div>
            <div className="px-2 py-3">
              <div className="font-display text-lg font-black tracking-tight">
                Rabbitstake
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
                        ? "bg-green text-black"
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
                  hasCurrentChallenge ? "bg-green" : "bg-white/42",
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
                <Badge className="border-green/45 text-green">
                  Challenge Dashboard
                </Badge>
                <Badge>No real-money play</Badge>
                {isLoadingData ? <Badge>Loading data</Badge> : null}
                {challengeDataError ? (
                  <Badge className="border-red-300/30 text-red-100">
                    Sync failed
                  </Badge>
                ) : null}
                {challengeDataUser?.email ? (
                  <Badge>Signed in: {challengeDataUser.email}</Badge>
                ) : null}
                {lastChallengeSyncAt ? (
                  <Badge>{lastActiveChallengeCount} DB active</Badge>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-2xl font-black tracking-tight sm:text-3xl">
                {screenTitle}
              </h1>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {hasCurrentChallenge ? (
                <Button
                  className="h-10 px-4 text-xs"
                  onClick={() =>
                    startChallengeFromDashboard(currentChallenge ?? activeChallenges[0])
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
              ) : null}
              <Button
                className="h-10 px-4 text-xs"
                variant="secondary"
                onClick={initializeData}
                disabled={isLoadingData}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync
              </Button>
              <Button className="h-10 px-4 text-xs" variant="danger" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </div>
          </header>

          {challengeDataError ? (
            <div className="shrink-0 rounded-lg border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Could not sync challenge assignments: {challengeDataError}
            </div>
          ) : lastChallengeSyncAt ? (
            <div className="shrink-0 rounded-lg border border-white/10 bg-black/18 px-4 py-3 text-xs text-white/52">
              Last sync {formatDateTime(lastChallengeSyncAt)}
              {challengeDataUser?.email
                ? ` as ${challengeDataUser.email}`
                : " with no signed-in Supabase user"}
              . Loaded {lastActiveChallengeCount} active database assignment
              {lastActiveChallengeCount === 1 ? "" : "s"}.
            </div>
          ) : null}

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
                    <div className="grid h-10 w-10 place-items-center rounded-lg border border-green/20 bg-green/10 text-green">
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
                          Active challenge buckets appear here after a developer
                          assigns a database challenge to your account.
                        </p>
                      </div>
                      <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl border border-green/20 bg-green/10 text-green sm:grid">
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
                        </div>
                      </div>
                      {activeChallenges.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/12 bg-black/14 p-5">
                          <div className="font-display text-lg font-bold text-white/80">
                            No assigned challenge
                          </div>
                          <p className="mt-2 text-sm text-white/50">
                            A developer must assign a database challenge to your
                            account before it appears here.
                          </p>
                          {lastChallengeSyncAt ? (
                            <p className="mt-3 text-xs text-white/42">
                              Last sync used{" "}
                              {challengeDataUser?.email ?? "no signed-in account"} and
                              loaded {lastActiveChallengeCount} active DB assignments.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="grid max-h-[48vh] gap-3 overflow-auto pr-1 md:grid-cols-2">
                          {activeChallenges.map((challenge) => {
                            const isCurrentChallenge =
                              currentChallenge?.id === challenge.id;
                            const questionCount =
                              challenge.evaluation?.questionCount ??
                              challenge.evaluation?.questions?.length ??
                              25;
                            const progressCount = isCurrentChallenge
                              ? completedCount
                              : challenge.currentQuestionIndex ??
                                challenge.progressResults?.length ??
                                0;
                            const currentPoints = isCurrentChallenge
                              ? stats.totalScore
                              : challenge.earnedPoints;
                            const challengeStatus = isCurrentChallenge
                              ? status
                              : challenge.status;

                            return (
                            <div
                              key={challenge.id}
                              className="rounded-lg border border-green/25 bg-black/60 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-display text-lg font-bold">
                                    {challenge.title}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Purchased {formatDate(challenge.purchasedAt)}
                                  </div>
                                  {challenge.assignmentCode ? (
                                    <div className="mt-2 inline-flex rounded-md border border-green/35 bg-green/10 px-2 py-1 font-display text-xs font-black tracking-[0.12em] text-green">
                                      #{challenge.assignmentCode}
                                    </div>
                                  ) : null}
                                </div>
                                <Badge className="border-green/45 text-green">
                                  {challengeStatus}
                                </Badge>
                              </div>
                              {challenge.isTestAssignment ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge className="border-yellow-200/45 text-yellow-100">
                                    Testing Replica
                                  </Badge>
                                  <Badge>Resettable in admin</Badge>
                                </div>
                              ) : null}
                              <div className="mt-4 grid grid-cols-3 gap-2">
                                {[
                                  ["Progress", `${progressCount}/${questionCount}`],
                                  ["Current", `${currentPoints} pts`],
                                  ["Target", `${fundedThresholdPoints} pts`],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-lg border border-white/10 bg-black/60 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      {label}
                                    </div>
                                    <div className="mt-1 font-display text-lg font-black text-green">
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Button
                                className="mt-4 h-10 w-full px-4 text-xs"
                                onClick={() => startChallengeFromDashboard(challenge)}
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
                          Challenge Buckets
                        </CardTitle>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                          View assigned challenges and completed outcomes.
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Badge>{activeChallenges.length} active</Badge>
                        <Badge>{pastChallenges.length} complete</Badge>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-display text-lg font-bold">
                          Active Challenges
                        </h3>
                        <Badge>{activeChallenges.length} active</Badge>
                      </div>
                      {activeChallenges.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/12 bg-black/14 p-5">
                          <div className="font-display text-lg font-bold text-white/80">
                            No assigned challenge
                          </div>
                          <p className="mt-2 text-sm text-white/50">
                            A developer assignment appears here after the dashboard
                            syncs with the database.
                          </p>
                          {lastChallengeSyncAt ? (
                            <p className="mt-3 text-xs text-white/42">
                              Last sync used{" "}
                              {challengeDataUser?.email ?? "no signed-in account"} and
                              loaded {lastActiveChallengeCount} active DB assignments.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {activeChallenges.map((challenge) => {
                            const isCurrentChallenge =
                              currentChallenge?.id === challenge.id;
                            const questionCount =
                              challenge.evaluation?.questionCount ??
                              challenge.evaluation?.questions?.length ??
                              25;
                            const progressCount = isCurrentChallenge
                              ? completedCount
                              : challenge.currentQuestionIndex ??
                                challenge.progressResults?.length ??
                                0;
                            const currentPoints = isCurrentChallenge
                              ? stats.totalScore
                              : challenge.earnedPoints;
                            const challengeStatus = isCurrentChallenge
                              ? status
                              : challenge.status;

                            return (
                              <div
                                key={challenge.id}
                                className="rounded-lg border border-green/25 bg-black/60 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="break-words font-display text-lg font-bold text-white">
                                      {challenge.title}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                                      <Clock3 className="h-3.5 w-3.5" />
                                      Assigned {formatDate(challenge.purchasedAt)}
                                    </div>
                                    {challenge.assignmentCode ? (
                                      <div className="mt-2 inline-flex rounded-md border border-green/35 bg-green/10 px-2 py-1 font-display text-xs font-black tracking-[0.12em] text-green">
                                        #{challenge.assignmentCode}
                                      </div>
                                    ) : null}
                                  </div>
                                  <Badge className="border-green/45 text-green">
                                    {challengeStatus}
                                  </Badge>
                                </div>
                                {challenge.isTestAssignment ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge className="border-yellow-200/45 text-yellow-100">
                                      Testing Replica
                                    </Badge>
                                    <Badge>Resettable in admin</Badge>
                                  </div>
                                ) : null}
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                  {[
                                    ["Progress", `${progressCount}/${questionCount}`],
                                    ["Current", `${currentPoints} pts`],
                                    ["Target", `${fundedThresholdPoints} pts`],
                                  ].map(([label, value]) => (
                                    <div
                                      key={label}
                                      className="rounded-lg border border-white/10 bg-black/60 p-3"
                                    >
                                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                        {label}
                                      </div>
                                      <div className="mt-1 font-display text-lg font-black text-green">
                                        {value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <Button
                                  className="mt-4 h-10 w-full px-4 text-xs"
                                  onClick={() => startChallengeFromDashboard(challenge)}
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

                    <div className="mt-8">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-display text-lg font-bold">
                          Past Challenge Buckets
                        </h3>
                        <Badge>{pastChallenges.length} complete</Badge>
                      </div>
                    <div className="mt-6 grid gap-3">
                      {pastChallenges.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/12 bg-black/14 p-6 text-sm text-white/48">
                          No past challenges yet.
                        </div>
                      ) : (
                        pastChallenges.map((challenge) => (
                          <div
                            key={challenge.id}
                            className="rounded-lg border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="break-words font-display text-lg font-bold text-white">
                                  {challenge.title}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                    Code
                                  </span>
                                  {challenge.assignmentCode ? (
                                    <span className="inline-flex rounded-md border border-green/35 bg-green/10 px-2 py-1 font-display text-xs font-black tracking-[0.12em] text-green">
                                      #{challenge.assignmentCode}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-white/45">
                                      Not available
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 text-xs text-white/45">
                                  Completed on {formatDateTime(challenge.completedAt)}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                <div className="text-right">
                                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                    Points Scored
                                  </div>
                                  <div className="font-display text-lg font-black text-green">
                                    {challenge.earnedPoints}/{challenge.totalPossiblePoints} pts
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    challenge.funded
                                      ? "border-green/45 text-green"
                                      : "border-red-300/30 text-red-100"
                                  }
                                >
                                  {challenge.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
                    <CheckCircle2 className="h-5 w-5 text-green" />
                    Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className="text-sm text-white/58">Challenge</span>
                    <span className="font-display text-sm font-bold">
                      {activeQuestionCount} questions
                    </span>
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
      </section>
      <Dialog open={Boolean(pendingChallengeStart)}>
        <DialogContent className="w-[min(92vw,32rem)] overflow-hidden border-green/25 bg-black/95 p-0 shadow-[0_0_64px_rgba(0,255,136,0.16)]">
          <div className="relative p-6 sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green/70 to-transparent" />
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-green/30 bg-green/12 text-green">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <Badge className="border-green/45 text-green">Challenge Start</Badge>
                <h2 className="mt-4 font-display text-2xl font-black tracking-tight text-white">
                  Placeholder message
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  Are you ready?
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button className="h-11 text-xs" onClick={confirmChallengeStart}>
                <Play className="mr-2 h-4 w-4" />
                Yes
              </Button>
              <Button
                className="h-11 text-xs"
                variant="secondary"
                onClick={closeStartGate}
              >
                No
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
