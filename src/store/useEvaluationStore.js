import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_FUNDED_THRESHOLD_PERCENT,
  getActiveEvaluation,
  getEvaluationFiles,
  getScenarioCategories,
} from "../engine/evaluationEngine";
import {
  completeAssignedChallenge,
  getAssignedChallengesForCurrentUser,
  getPastChallengesForCurrentUser,
  markAssignedChallengeStarted,
  recordAssignedChallengeProgress,
} from "../lib/challengeDatabase";
import { getBestOption, getGrade } from "../lib/utils";

const DEFAULT_DECISION_TIME_LIMIT_SECONDS = 25;

const initialStats = {
  totalScore: 0,
  completedScenarios: [],
};

const roundScore = (value) => Math.round(value * 10) / 10;

const initialEvaluation = getActiveEvaluation();

const createChallenge = (evaluation) => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `challenge_${Date.now()}`,
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
  scenarioResults: [],
  progressResults: [],
  currentQuestionIndex: 0,
  decisionTimeLimitSeconds: DEFAULT_DECISION_TIME_LIMIT_SECONDS,
});

const getScenarioPool = (category, scenarios) => {
  if (!category || category === "All") return scenarios;

  return scenarios.filter((scenario) => {
    return scenario.category === category || scenario.street === category;
  });
};

const createStatsFromResults = (results = []) => ({
  totalScore: roundScore(
    results.reduce((total, scenario) => total + (scenario.points ?? 0), 0),
  ),
  completedScenarios: results,
});

const getCompletedEntry = (scenario, option, timedOut = false) => {
  const maxPoints = scenario.points ?? 100;
  const earnedPoints = timedOut ? 0 : roundScore((maxPoints * option.points) / 100);

  return {
    id: scenario.id,
    title: scenario.title,
    category: scenario.category,
    selectedAction: timedOut ? "Timed out" : option.label,
    actionScore: timedOut ? 0 : option.points,
    points: earnedPoints,
    maxPoints,
    bestAction: getBestOption(scenario.options).label,
    feedback: timedOut
      ? "No action was selected before the decision timer expired."
      : option.feedback,
    timedOut,
  };
};

export const useEvaluationStore = create(
  persist((set, get) => ({
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
  decisionResult: null,
  decisionSecondsRemaining: DEFAULT_DECISION_TIME_LIMIT_SECONDS,
  decisionTimerRunning: false,
  feedbackVisible: false,
  hasPurchasedChallenge: false,
  currentChallenge: null,
  activeChallenges: [],
  pastChallenges: [],
  stats: initialStats,
  isLoadingData: false,

  initializeData: async () => {
    set({ isLoadingData: true });

    try {
      const [assignedChallenges, pastDatabaseChallenges] = await Promise.all([
        getAssignedChallengesForCurrentUser(),
        getPastChallengesForCurrentUser(),
      ]);

      if (assignedChallenges.length > 0) {
        const currentChallenge = assignedChallenges[0];
        const activeEvaluation = currentChallenge.evaluation;
        const scenarios = activeEvaluation.questions;
        const restoredResults =
          currentChallenge.progressResults?.length > 0
            ? currentChallenge.progressResults
            : currentChallenge.scenarioResults ?? [];
        const restoredStats = createStatsFromResults(restoredResults);
        const restoredScenarioIndex = Math.min(
          currentChallenge.currentQuestionIndex ?? restoredResults.length,
          Math.max(scenarios.length - 1, 0),
        );

        set({
          evaluations: getEvaluationFiles(),
          activeEvaluation,
          scenarios,
          scenarioCategories: getScenarioCategories(scenarios),
          currentScenario: scenarios[restoredScenarioIndex] ?? scenarios[0],
          currentScenarioIndex: restoredScenarioIndex,
          currentStreet: (scenarios[restoredScenarioIndex] ?? scenarios[0]).street,
          hasPurchasedChallenge: true,
          currentChallenge,
          activeChallenges: assignedChallenges,
          pastChallenges: pastDatabaseChallenges,
          stats: restoredStats,
          selectedAction: null,
          decisionResult: null,
          decisionSecondsRemaining:
            currentChallenge.decisionTimeLimitSeconds ??
            DEFAULT_DECISION_TIME_LIMIT_SECONDS,
          decisionTimerRunning: false,
          feedbackVisible: false,
          isLoadingData: false,
        });
        return;
      }

      const activeEvaluation = getActiveEvaluation();
      const scenarios = activeEvaluation.questions;

      set({
        evaluations: getEvaluationFiles(),
        activeEvaluation,
        scenarios,
        scenarioCategories: getScenarioCategories(scenarios),
        currentScenario: scenarios[0],
        currentStreet: scenarios[0].street,
        hasPurchasedChallenge: false,
        currentChallenge: null,
        activeChallenges: [],
        pastChallenges: pastDatabaseChallenges,
        selectedAction: null,
        decisionResult: null,
        decisionSecondsRemaining: DEFAULT_DECISION_TIME_LIMIT_SECONDS,
        decisionTimerRunning: false,
        feedbackVisible: false,
        isLoadingData: false,
      });
      return;
    } catch (error) {
      console.error("Could not load assigned database challenges.", error);
    }

    const activeEvaluation = getActiveEvaluation();
    const scenarios = activeEvaluation.questions;

    set({
      evaluations: getEvaluationFiles(),
      activeEvaluation,
      scenarios,
      scenarioCategories: getScenarioCategories(scenarios),
      currentScenario: scenarios[0],
      currentStreet: scenarios[0].street,
      isLoadingData: false,
    });
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
  },

  startEvaluation: async (category, challengeId) => {
    const { activeChallenges } = get();
    const currentChallenge =
      activeChallenges.find((challenge) => challenge.id === challengeId) ??
      get().currentChallenge ??
      activeChallenges[0];
    if (!currentChallenge) return;

    const activeEvaluation = currentChallenge.evaluation ?? get().activeEvaluation;
    const scenarios = activeEvaluation.questions;
    const selectedCategory = category ?? get().selectedCategory;
    const pool = getScenarioPool(selectedCategory, scenarios);
    const resumedResults =
      currentChallenge.progressResults?.length > 0
        ? currentChallenge.progressResults
        : currentChallenge.scenarioResults ?? [];
    const resumeIndex = Math.min(
      currentChallenge.currentQuestionIndex ?? resumedResults.length,
      Math.max(pool.length - 1, 0),
    );
    const firstScenario = pool[resumeIndex] ?? pool[0] ?? scenarios[0];
    const nextStats = createStatsFromResults(resumedResults);

    const nextChallenge = {
      ...currentChallenge,
      status: "In progress",
      startedAt: currentChallenge.startedAt ?? new Date().toISOString(),
      score: currentChallenge.score ?? 0,
      earnedPoints: nextStats.totalScore,
      funded: false,
      progressResults: resumedResults,
      currentQuestionIndex: resumedResults.length,
    };

    if (nextChallenge.dbBacked && nextChallenge.assignmentId) {
      try {
        await markAssignedChallengeStarted(nextChallenge.assignmentId);
      } catch (error) {
        console.error("Could not mark assigned challenge as started.", error);
      }
    }

    set({
      activeEvaluation,
      scenarios,
      scenarioCategories: getScenarioCategories(scenarios),
      selectedCategory,
      mode: "table",
      currentScenarioIndex: resumeIndex,
      currentScenario: firstScenario,
      currentStreet: firstScenario.street,
      animationStep: 0,
      selectedAction: null,
      decisionResult: null,
      feedbackVisible: false,
      decisionSecondsRemaining:
        nextChallenge.decisionTimeLimitSeconds ??
        DEFAULT_DECISION_TIME_LIMIT_SECONDS,
      decisionTimerRunning: false,
      stats: nextStats,
      currentChallenge: nextChallenge,
      activeChallenges: activeChallenges.map((challenge) =>
        challenge.id === nextChallenge.id ? nextChallenge : challenge,
      ),
    });
  },

  purchaseChallenge: async () => {
    const activeEvaluation = get().activeEvaluation;
    const nextChallenge = createChallenge(activeEvaluation);
    const activeChallenges = [...get().activeChallenges, nextChallenge];

    set({
      hasPurchasedChallenge: true,
      currentChallenge: get().currentChallenge ?? nextChallenge,
      activeChallenges,
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
      decisionResult: null,
      decisionTimerRunning: false,
      feedbackVisible: false,
    });
  },

  advanceAnimation: () => {
    const { currentScenario, animationStep } = get();
    const maxStep = currentScenario.previousActions.length;

    if (animationStep < maxStep) {
      set({ animationStep: animationStep + 1 });
      return;
    }

    set({
      decisionTimerRunning: true,
      decisionSecondsRemaining:
        get().currentChallenge?.decisionTimeLimitSeconds ??
        DEFAULT_DECISION_TIME_LIMIT_SECONDS,
    });
  },

  startDecisionTimer: () => {
    const { selectedAction, decisionResult, decisionTimerRunning } = get();
    if (selectedAction || decisionResult || decisionTimerRunning) return;

    set({
      decisionTimerRunning: true,
      decisionSecondsRemaining:
        get().currentChallenge?.decisionTimeLimitSeconds ??
        DEFAULT_DECISION_TIME_LIMIT_SECONDS,
    });
  },

  tickDecisionTimer: async () => {
    const {
      decisionSecondsRemaining,
      decisionTimerRunning,
      decisionResult,
      selectedAction,
    } = get();

    if (!decisionTimerRunning || decisionResult || selectedAction) return;

    if (decisionSecondsRemaining <= 1) {
      set({ decisionSecondsRemaining: 0, decisionTimerRunning: false });
      await get().selectAction(null, { timedOut: true });
      return;
    }

    set({ decisionSecondsRemaining: decisionSecondsRemaining - 1 });
  },

  selectAction: async (option, config = {}) => {
    const { currentScenario, stats } = get();
    const alreadyCompleted = stats.completedScenarios.some(
      (completed) => completed.id === currentScenario.id,
    );
    const selectedOption = option ?? getBestOption(currentScenario.options);
    const completedEntry = getCompletedEntry(
      currentScenario,
      selectedOption,
      Boolean(config.timedOut),
    );
    const completedScenarios = alreadyCompleted
      ? stats.completedScenarios
      : [...stats.completedScenarios, completedEntry];
    const nextStats = {
      totalScore: roundScore(
        completedScenarios.reduce((total, scenario) => total + scenario.points, 0),
      ),
      completedScenarios,
    };
    const nextChallenge = get().currentChallenge
      ? {
          ...get().currentChallenge,
          earnedPoints: nextStats.totalScore,
          progressResults: completedScenarios,
          scenarioResults: completedScenarios,
          currentQuestionIndex: completedScenarios.length,
        }
      : null;

    set({
      selectedAction: config.timedOut ? null : selectedOption,
      decisionResult: completedEntry,
      feedbackVisible: true,
      decisionTimerRunning: false,
      stats: nextStats,
      currentChallenge: nextChallenge,
      activeChallenges: nextChallenge
        ? get().activeChallenges.map((challenge) =>
            challenge.id === nextChallenge.id ? nextChallenge : challenge,
          )
        : get().activeChallenges,
    });

    if (nextChallenge?.dbBacked && nextChallenge.assignmentId) {
      try {
        await recordAssignedChallengeProgress(nextChallenge.assignmentId, {
          nextQuestionIndex: completedScenarios.length,
          scenarioResults: completedScenarios,
        });
      } catch (error) {
        console.error("Could not save assigned challenge progress.", error);
      }
    }
  },

  hideFeedback: () => {
    set({ feedbackVisible: false });
  },

  nextScenario: async () => {
    const { selectedCategory, currentScenario, currentScenarioIndex, scenarios } = get();
    const pool = getScenarioPool(selectedCategory, scenarios);
    const currentPoolIndex = pool.findIndex((scenario) => {
      return scenario.id === currentScenario.id;
    });
    const nextIndex =
      currentPoolIndex >= 0 ? currentPoolIndex + 1 : currentScenarioIndex + 1;

    if (nextIndex >= pool.length) {
      const { activeChallenges, currentChallenge, pastChallenges, stats } = get();
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
            scenarioResults: stats.completedScenarios,
          }
        : null;

      let syncedPastChallenges = completedChallenge
        ? [completedChallenge, ...pastChallenges]
        : pastChallenges;

      if (completedChallenge?.dbBacked && completedChallenge.assignmentId) {
        try {
          await completeAssignedChallenge(completedChallenge.assignmentId, completedChallenge);
          syncedPastChallenges = await getPastChallengesForCurrentUser();
        } catch (error) {
          console.error("Could not save assigned challenge result.", error);
        }
      }

      const remainingActiveChallenges = currentChallenge
        ? activeChallenges.filter((challenge) => challenge.id !== currentChallenge.id)
        : activeChallenges;

      set({
        mode: "summary",
        feedbackVisible: false,
        hasPurchasedChallenge: remainingActiveChallenges.length > 0,
        currentChallenge: remainingActiveChallenges[0] ?? null,
        activeChallenges: remainingActiveChallenges,
        pastChallenges: syncedPastChallenges,
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
      decisionResult: null,
      decisionSecondsRemaining:
        get().currentChallenge?.decisionTimeLimitSeconds ??
        DEFAULT_DECISION_TIME_LIMIT_SECONDS,
      decisionTimerRunning: false,
      feedbackVisible: false,
    });
  },

  goDashboard: () => {
    set({
      mode: "dashboard",
      feedbackVisible: false,
      selectedAction: null,
      decisionResult: null,
      decisionTimerRunning: false,
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
  }), {
    name: "rabbitshark.challengeState",
    version: 2,
    migrate: (persistedState) => ({
      ...persistedState,
      pastChallenges: [],
    }),
    partialize: (state) => ({
      hasPurchasedChallenge: state.activeChallenges.length > 0,
      currentChallenge: state.currentChallenge,
      activeChallenges: state.activeChallenges,
    }),
  }),
);
