export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatChips(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }

  return String(value);
}

export function getGrade(averageScore) {
  if (averageScore >= 90) return "Elite";
  if (averageScore >= 75) return "Strong";
  if (averageScore >= 60) return "Improving";
  return "Needs Work";
}

export function getBestOption(options) {
  return options.reduce((best, option) => {
    return option.points > best.points ? option : best;
  }, options[0]);
}
