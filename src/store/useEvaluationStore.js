import { create } from "zustand";
import {
  DEFAULT_FUNDED_THRESHOLD_PERCENT,
  getActiveEvaluation,
  getEvaluationFiles,
  getScenarioCategories,
} from "../engine/evaluationEngine";
import { getBestOption, getGrade } from "../lib/utils";

const initialStats = {
  totalScore: 0,
  completedScenarios: [],
};

const roundScore = (value) => Math.round(value * 10) / 10;

const initialEvaluation = getActiveEvaluation();

const createChallenge = (evaluation) => ({
  id: `challenge_${Date.now()}`,
  title: "Funding Challenge",
  evaluationId: evaluation.id,
  status: "Ready",
  purchasedAt: new Date().toISOString(),
  startedAt: null,
  completedAt: null,
  score: 0,
  earnedPoints: 0,
  totalPossiblePoints: evaluation.totalPossiblePoints,
  funded: false,
});

const getScenarioPool = (category, scenarios) => {
  if (!category || category === "All") return scenarios;

  return scenarios.filter((scenario) => {
    return scenario.category === category || scenario.street === category;
  });
};

export const useEvaluationStore = create((set, get) => ({
  evaluations: getEvaluationFiles(),
  activeEvaluation: initialEvaluation,
  scenarios: initialEvaluation.questions,
  scenarioCategories: getScenarioCategories(initialEvaluation.questions),
  selectedCategory: "All",
  mode: "dashboard",
  currentScenarioIndex: 0,
  currentScenario: initialEvaluation.questions[0],
  currentStreet: initialEvaluation.questions[0].street,
  animationStep: 0,
  selectedAction: null,
  feedbackVisible: false,
  hasPurchasedChallenge: false,
  currentChallenge: null,
  pastChallenges: [],
  stats: initialStats,

  setCategory: (category) => {
    set({ selectedCategory: category });
  },

  startEvaluation: (category) => {
    const currentChallenge = get().currentChallenge;
    if (!currentChallenge) return;

    const activeEvaluation = getActiveEvaluation();
    const scenarios = activeEvaluation.questions;
    const selectedCategory = category ?? get().selectedCategory;
    const pool = getScenarioPool(selectedCategory, scenarios);
    const firstScenario = pool[0] ?? scenarios[0];

    set({
      activeEvaluation,
      scenarios,
      scenarioCategories: getScenarioCategories(scenarios),
      selectedCategory,
      mode: "table",
      currentScenarioIndex: 0,
      currentScenario: firstScenario,
      currentStreet: firstScenario.street,
      animationStep: 0,
      selectedAction: null,
      feedbackVisible: false,
      stats: initialStats,
      currentChallenge: {
        ...currentChallenge,
        status: "In progress",
        startedAt: currentChallenge.startedAt ?? new Date().toISOString(),
        score: 0,
        earnedPoints: 0,
        funded: false,
      },
    });
  },

  purchaseChallenge: () => {
    const activeEvaluation = getActiveEvaluation();

    set({
      hasPurchasedChallenge: true,
      currentChallenge: createChallenge(activeEvaluation),
    });
  },

  openScenario: (scenarioId) => {
    const { scenarios } = get();
    const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];

    set({
      selectedCategory: scenario.category,
      mode: "table",
      currentScenarioIndex: 0,
      currentScenario: scenario,
      currentStreet: scenario.street,
      animationStep: 0,
      selectedAction: null,
      feedbackVisible: false,
    });
  },

  advanceAnimation: () => {
    const { currentScenario, animationStep } = get();
    const maxStep = currentScenario.previousActions.length;

    if (animationStep < maxStep) {
      set({ animationStep: animationStep + 1 });
    }
  },

  selectAction: (option) => {
    const { currentScenario, stats } = get();
    const maxPoints = currentScenario.points ?? 100;
    const earnedPoints = roundScore((maxPoints * option.points) / 100);
    const alreadyCompleted = stats.completedScenarios.some(
      (completed) => completed.id === currentScenario.id,
    );
    const completedEntry = {
      id: currentScenario.id,
      title: currentScenario.title,
      category: currentScenario.category,
      selectedAction: option.label,
      actionScore: option.points,
      points: earnedPoints,
      maxPoints,
      bestAction: getBestOption(currentScenario.options).label,
    };

    set({
      selectedAction: option,
      feedbackVisible: false,
      stats: alreadyCompleted
        ? stats
        : {
            totalScore: roundScore(stats.totalScore + earnedPoints),
            completedScenarios: [...stats.completedScenarios, completedEntry],
          },
    });

    get().nextScenario();
  },

  hideFeedback: () => {
    set({ feedbackVisible: false });
  },

  nextScenario: () => {
    const { selectedCategory, currentScenario, currentScenarioIndex, scenarios } = get();
    const pool = getScenarioPool(selectedCategory, scenarios);
    const currentPoolIndex = pool.findIndex((scenario) => {
      return scenario.id === currentScenario.id;
    });
    const nextIndex =
      currentPoolIndex >= 0 ? currentPoolIndex + 1 : currentScenarioIndex + 1;

    if (nextIndex >= pool.length) {
      const { currentChallenge, pastChallenges, stats } = get();
      const score = get().getAverageScore();
      const completedChallenge = currentChallenge
        ? {
            ...currentChallenge,
            status: get().isFunded() ? "Funded" : "Failed",
            completedAt: new Date().toISOString(),
            score,
            earnedPoints: stats.totalScore,
            totalPossiblePoints: get().getTotalPossibleScore(),
            funded: get().isFunded(),
          }
        : null;

      set({
        mode: "summary",
        feedbackVisible: false,
        hasPurchasedChallenge: false,
        currentChallenge: null,
        pastChallenges: completedChallenge
          ? [completedChallenge, ...pastChallenges]
          : pastChallenges,
      });
      return;
    }

    const next = pool[nextIndex];

    set({
      mode: "table",
      currentScenarioIndex: nextIndex,
      currentScenario: next,
      currentStreet: next.street,
      animationStep: 0,
      selectedAction: null,
      feedbackVisible: false,
    });
  },

  goDashboard: () => {
    set({
      mode: "dashboard",
      feedbackVisible: false,
      selectedAction: null,
    });
  },

  resetEvaluation: () => {
    const activeEvaluation = getActiveEvaluation();
    const scenarios = activeEvaluation.questions;

    set({
      activeEvaluation,
      scenarios,
      scenarioCategories: getScenarioCategories(scenarios),
      mode: "dashboard",
      currentScenarioIndex: 0,
      currentScenario: scenarios[0],
      currentStreet: scenarios[0].street,
      animationStep: 0,
      selectedAction: null,
      feedbackVisible: false,
      stats: initialStats,
      currentChallenge: get().currentChallenge
        ? {
            ...get().currentChallenge,
            status: "Ready",
            startedAt: null,
            score: 0,
            earnedPoints: 0,
            funded: false,
          }
        : null,
    });
  },

  getAverageScore: () => {
    const { stats } = get();
    if (stats.completedScenarios.length === 0) return 0;
    const completedPossibleScore = stats.completedScenarios.reduce(
      (total, scenario) => total + scenario.maxPoints,
      0,
    );

    if (completedPossibleScore === 0) return 0;
    return Math.round((stats.totalScore / completedPossibleScore) * 100);
  },

  getAccuracyGrade: () => {
    return getGrade(get().getAverageScore());
  },

  getTotalPossibleScore: () => {
    const { scenarios } = get();
    return scenarios.reduce((total, scenario) => total + (scenario.points ?? 100), 0);
  },

  getFundedThresholdPercent: () => {
    return (
      get().activeEvaluation.fundedThresholdPercent ??
      DEFAULT_FUNDED_THRESHOLD_PERCENT
    );
  },

  getFundedThresholdPoints: () => {
    return Math.ceil(
      (get().getTotalPossibleScore() * get().getFundedThresholdPercent()) / 100,
    );
  },

  isFunded: () => {
    const { stats, scenarios } = get();
    return (
      stats.completedScenarios.length >= scenarios.length &&
      get().getAverageScore() >= get().getFundedThresholdPercent()
    );
  },
}));
