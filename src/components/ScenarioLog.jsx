import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function ScenarioLog({ actions, visibleCount }) {
  const visibleActions = actions.slice(0, visibleCount);
  const activeIndex = visibleActions.length - 1;

  return (
    <Card className="max-h-[calc(100dvh-180px)] overflow-hidden p-3">
      <CardHeader className="mb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Hand Log</CardTitle>
          <span className="text-xs font-bold text-white/50">
            {visibleCount}/{actions.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="space-y-1 text-xs leading-5 text-white/62">
          <AnimatePresence initial={false}>
            {visibleActions.map((action, index) => (
              <motion.div
                key={`${action}-${index}`}
                className={[
                  "truncate rounded-md px-2 py-1 transition-colors",
                  index === activeIndex
                    ? "border border-green/25 bg-green/10 text-green"
                    : "text-white/62",
                  /\bfolds?\b/i.test(action) && index === activeIndex
                    ? "shadow-[0_0_22px_rgba(0,255,171,.14)]"
                    : "",
                ].join(" ")}
                initial={{ x: 18, opacity: 0 }}
                animate={{ x: 0, opacity: 1, scale: index === activeIndex ? 1.015 : 1 }}
                exit={{ x: -18, opacity: 0 }}
                transition={{ duration: 0.24 }}
              >
                <span className="mr-2 text-green/80">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {action}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
