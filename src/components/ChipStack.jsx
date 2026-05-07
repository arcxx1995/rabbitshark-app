import { motion } from "framer-motion";

const chipColors = ["bg-danger-500", "bg-gold-500", "bg-sky-400", "bg-white"];

export default function ChipStack({ compact = false }) {
  const chips = compact ? 3 : 5;

  return (
    <div className="flex items-end justify-center">
      <div className="relative h-4 w-8">
        {Array.from({ length: chips }).map((_, index) => (
          <motion.span
            key={index}
            className={`absolute left-0 h-2 w-7 rounded-full border border-black/40 ${chipColors[index % chipColors.length]}`}
            style={{ bottom: index * 3 }}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <span className="absolute inset-x-2 top-1 h-px bg-black/25" />
          </motion.span>
        ))}
      </div>
    </div>
  );
}
