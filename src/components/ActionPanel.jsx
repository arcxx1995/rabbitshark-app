import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function ActionPanel({
  scenario,
  disabled,
  selectedAction,
  onSelectAction,
  compact = false,
}) {
  if (compact) {
    return (
      <section className="px-1 pb-1">
        <div className="mb-3 grid grid-cols-[1fr_auto] items-start gap-3 sm:mb-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-400">
              Decision Point
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-white/78 sm:text-sm">
              {scenario.decisionPoint}
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-black/28 px-2 py-1 text-right">
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
              Pot
            </div>
            <div className="font-display text-xs font-black text-gold-400 sm:text-sm">
              {scenario.pot} BB
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {scenario.options.map((option, index) => (
            <motion.div
              key={option.label}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.04 }}
            >
              <Button
                className="h-11 w-full whitespace-normal rounded-xl border border-white/10 px-2 text-[9px] leading-tight shadow-lg sm:h-12 sm:px-3 sm:text-xs"
                variant={selectedAction?.label === option.label ? "felt" : "secondary"}
                disabled={disabled || Boolean(selectedAction)}
                onClick={() => onSelectAction(option)}
              >
                {option.label}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Choose Action</CardTitle>
            <p className="mt-1 text-sm text-white/58">{scenario.decisionPoint}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/24 px-4 py-2 text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Pot
            </div>
            <div className="font-display text-xl font-bold text-gold-400">
              {scenario.pot} BB
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {scenario.options.map((option, index) => (
            <motion.div
              key={option.label}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                className="h-16 w-full whitespace-normal rounded-2xl px-3 text-center leading-tight"
                variant={selectedAction?.label === option.label ? "felt" : "secondary"}
                disabled={disabled || Boolean(selectedAction)}
                onClick={() => onSelectAction(option)}
              >
                {option.label}
              </Button>
            </motion.div>
          ))}
        </div>
        <p className="text-xs font-medium text-white/45">
          Scoring rewards the closest GTO decision. This simulator is educational only and does not support real-money play.
        </p>
      </CardContent>
    </Card>
  );
}
