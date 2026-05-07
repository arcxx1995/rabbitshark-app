import { scenarioCategories } from "../data/scenarios";
import { cn } from "../lib/utils";

export default function ScenarioSelector({ selectedCategory, onSelectCategory }) {
  return (
    <div className="flex flex-wrap gap-2">
      {scenarioCategories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelectCategory(category)}
          className={cn(
            "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition",
            selectedCategory === category
              ? "border-gold-400 bg-gold-500 text-room-950"
              : "border-white/10 bg-white/[0.07] text-white/62 hover:border-white/20 hover:bg-white/12 hover:text-white",
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
