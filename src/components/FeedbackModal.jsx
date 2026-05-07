import { Target } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { getBestOption } from "../lib/utils";

export default function FeedbackModal({
  open,
  scenario,
  selectedAction,
  onNext,
  onDashboard,
}) {
  if (!selectedAction) return null;

  const bestOption = getBestOption(scenario.options);

  return (
    <Dialog open={open}>
      <DialogContent>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Badge className="mb-3 border-felt-500/40 text-felt-500">
              {scenario.strategicConcept}
            </Badge>
            <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
              Decision Feedback
            </h2>
            <p className="mt-2 text-sm text-white/58">{scenario.title}</p>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gold-500/15 text-gold-400">
            <Target size={28} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/28 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Selected
            </div>
            <div className="mt-2 font-display text-lg font-bold">
              {selectedAction.label}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/28 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Points
            </div>
            <div className="mt-2 font-display text-lg font-bold text-gold-400">
              {selectedAction.points}/100
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/28 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Best GTO
            </div>
            <div className="mt-2 font-display text-lg font-bold text-felt-500">
              {bestOption.label}
            </div>
          </div>
        </div>

        <div className="my-5">
          <Progress value={selectedAction.points} />
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">
              Action Feedback
            </div>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {selectedAction.feedback}
            </p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">
              GTO Explanation
            </div>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {scenario.explanation}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onDashboard}>
            Dashboard
          </Button>
          <Button onClick={onNext}>Next Scenario</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
