import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";

export function Dialog({ open, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function DialogContent({ className, children }) {
  return (
    <motion.div
      initial={{ y: 28, scale: 0.96, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: 20, scale: 0.96, opacity: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className={cn(
        "max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/12 bg-room-900/95 p-6 shadow-2xl",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
