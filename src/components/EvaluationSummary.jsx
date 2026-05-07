import { Award, Home, RotateCcw } from "lucide-react";
import ScorePanel from "./ScorePanel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { useEvaluationStore } from "../store/useEvaluationStore";

export default function EvaluationSummary() {
  const stats = useEvaluationStore((state) => state.stats);
  const average = useEvaluationStore((state) => state.getAverageScore());
  const grade = useEvaluationStore((state) => state.getAccuracyGrade());
  const totalPossible = useEvaluationStore((state) => state.getTotalPossibleScore());
  const fundedThresholdPoints = useEvaluationStore((state) =>
    state.getFundedThresholdPoints(),
  );
  const fundedThresholdPercent = useEvaluationStore((state) =>
    state.getFundedThresholdPercent(),
  );
  const funded = useEvaluationStore((state) => state.isFunded());
  const goDashboard = useEvaluationStore((state) => state.goDashboard);
  const resetEvaluation = useEvaluationStore((state) => state.resetEvaluation);

  return (
    <main className="h-dvh overflow-hidden bg-room bg-fixed px-3 py-3 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid h-full max-w-6xl gap-3 lg:grid-cols-[1fr_340px] lg:gap-6">
        <section className="glass-panel min-h-0 overflow-hidden rounded-[1.75rem] p-5 sm:rounded-[2.75rem] sm:p-10">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-500/15 text-gold-400 sm:h-16 sm:w-16 sm:rounded-3xl">
            <Award size={28} />
          </div>
          <h1 className="mt-4 font-display text-3xl font-black tracking-tight sm:mt-6 sm:text-6xl">
            {funded ? "Funded" : "Evaluation Summary"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/62 sm:mt-4 sm:text-base">
            Your result is based on weighted question points and rewards
            decisions closest to the scripted GTO benchmark.
          </p>

          <div className="my-5 sm:my-8">
            <div className="mb-3 flex items-end justify-between">
              <span className="font-display text-2xl font-black text-gold-400 sm:text-3xl">
                {stats.totalScore}/{totalPossible} pts
              </span>
              <span className="font-display text-xl font-bold sm:text-2xl">
                {funded ? "Funded" : grade}
              </span>
            </div>
            <Progress value={average} />
            <div className="mt-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-white/45">
              <span>{average}% score</span>
              <span>
                Funded target: {fundedThresholdPoints} pts ({fundedThresholdPercent}%)
              </span>
            </div>
          </div>

          <div className="hidden gap-3 overflow-hidden md:grid md:grid-cols-2">
            {stats.completedScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="rounded-[1.5rem] border border-white/10 bg-black/24 p-4"
              >
                <div className="font-display font-bold">{scenario.title}</div>
                <div className="mt-2 text-sm text-white/58">
                  Selected {scenario.selectedAction}; best action was{" "}
                  {scenario.bestAction}.
                </div>
                <div className="mt-3 text-xl font-black text-gold-400">
                  {scenario.points}/{scenario.maxPoints} pts
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Action score: {scenario.actionScore}/100
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
            <Button onClick={goDashboard}>
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="secondary" onClick={resetEvaluation}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Evaluation
            </Button>
          </div>
        </section>

        <aside className="hidden min-h-0 space-y-3 overflow-hidden lg:block">
          <ScorePanel compact />
          <Card>
            <CardHeader>
              <CardTitle>Grade Bands</CardTitle>
            </CardHeader>
            <CardContent>
              {[
                [`${fundedThresholdPercent}%+`, "Funded"],
                ["90-100", "Elite"],
                ["75-89", "Strong"],
                ["60-74", "Improving"],
                ["Below 60", "Needs Work"],
              ].map(([range, label]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl bg-black/24 px-4 py-3"
                >
                  <span className="text-sm text-white/58">{range}</span>
                  <span className="font-display font-bold">{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
