import { Trophy } from "lucide-react";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { useEvaluationStore } from "../store/useEvaluationStore";

export default function ScorePanel({ compact = false }) {
  const stats = useEvaluationStore((state) => state.stats);
  const average = useEvaluationStore((state) => state.getAverageScore());
  const grade = useEvaluationStore((state) => state.getAccuracyGrade());
  const totalPossible = useEvaluationStore((state) => state.getTotalPossibleScore());
  const fundedThresholdPercent = useEvaluationStore((state) =>
    state.getFundedThresholdPercent(),
  );
  const fundedThresholdPoints = useEvaluationStore((state) =>
    state.getFundedThresholdPoints(),
  );
  const funded = useEvaluationStore((state) => state.isFunded());

  return (
    <Card className={compact ? "p-3" : "p-4"}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gold-500/15 text-gold-400">
          <Trophy size={compact ? 18 : 21} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Score Meter
            </p>
            <p className="font-display text-lg font-bold text-gold-400">
              {funded ? "Funded" : grade}
            </p>
          </div>
          <div className="relative mt-2 pb-4">
            <Progress value={average} />
            <div
              className="absolute top-[-3px] h-4 w-px bg-gold-300"
              style={{ left: `${fundedThresholdPercent}%` }}
            />
            <div
              className="absolute top-3 -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.12em] text-gold-300"
              style={{ left: `${fundedThresholdPercent}%` }}
            >
              Funded
            </div>
          </div>
        </div>
      </div>
      <div className={compact ? "mt-3 grid grid-cols-3 gap-2 text-center" : "mt-4 grid grid-cols-3 gap-2 text-center"}>
        <div className="rounded-2xl bg-black/24 p-2 sm:p-3">
          <div className="font-display text-lg font-bold sm:text-xl">
            {stats.totalScore}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Points
          </div>
        </div>
        <div className="rounded-2xl bg-black/24 p-2 sm:p-3">
          <div className="font-display text-lg font-bold sm:text-xl">
            {fundedThresholdPoints}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Target
          </div>
        </div>
        <div className="rounded-2xl bg-black/24 p-2 sm:p-3">
          <div className="font-display text-lg font-bold sm:text-xl">{totalPossible}</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Max
          </div>
        </div>
      </div>
    </Card>
  );
}
