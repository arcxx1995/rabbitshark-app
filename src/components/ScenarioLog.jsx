import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function ScenarioLog({ actions, visibleCount }) {
  const visibleActions = actions.slice(0, visibleCount);

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
                className="truncate"
                initial={{ x: 18, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -18, opacity: 0 }}
              >
                <span className="mr-2 text-gold-400">
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
