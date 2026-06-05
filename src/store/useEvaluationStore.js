import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_FUNDED_THRESHOLD_PERCENT,
  getActiveEvaluation,
  getEvaluationFiles,
  getScenarioCategories,
} from "../engine/evaluationEngine";
import { evaluatePokerDecision } from "../engine/pokerEngine";
import {
  completeAssignedChallenge,
  getCurrentUserChallengeDashboard,
  getPastChallengesForCurrentUser,
  markAssignedChallengeStarted,
  recordAssignedChallengeProgress,
} from "../lib/challengeDatabase";
import { PLAYER_CHALLENGE_STATE_STORAGE_KEY } from "../lib/challengeStateStorage";
import { getGrade } from "../lib/utils";

const DEFAULT_DECISION_TIME_LIMIT_SECONDS = 25;

const initialStats = {
  totalScore: 0,
  completedScenarios: [],
};

const roundScore = (value) => Math.round(value * 10) / 10;

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

const getChallengeKey = (challenge) => {
  return challenge?.assignmentId ?? challenge?.id ?? null;
};

const mergeChallengeLists = (...lists) => {
  const seen = new Set();
  const merged = [];

  lists.flat().forEach((challenge) => {
    if (!challenge) return;

    const key = getChallengeKey(challenge);

    if (key && seen.has(key)) return;
    if (key) seen.add(key);

    merged.push(challenge);
  });

  return merged;
};

const getErrorMessage = (error, fallback) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return fallback;
};

const createDefaultChallengeState = (challengeStateUserId = null) => {
  const activeEvaluation = getActiveEvaluation();
  const scenarios = activeEvaluation.questions;

  return {
    evaluations: getEvaluationFiles(),
    activeEvaluation,
    scenarios,
    scenarioCategories: getScenarioCategories(scenarios),
    selectedCategory: "All",
    mode: "dashboard",
    currentScenarioIndex: 0,
    currentScenario: scenarios[0],
    currentStreet: scenarios[0]?.street ?? "",
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
    completedChallengeSummary: null,
    stats: initialStats,
    isLoadingData: false,
    challengeDataError: null,
  challengeDataUser: null,
  challengeStateUserId,
  assignmentRealtimeStatus: "idle",
  assignmentRealtimeMessage: "Realtime sync has not started.",
  lastChallengeSyncAt: null,
  lastActiveChallengeCount: 0,
  };
};

export const useEvaluationStore = create(
  persist((set, get) => ({
  ...createDefaultChallengeState(),

  resetChallengeStateForUser: (userId = null) => {
    set(createDefaultChallengeState(userId));
  },

  prepareChallengeStateForUser: (userId) => {
    const currentUserId = get().challengeStateUserId;

    if (!userId) {
      get().resetChallengeStateForUser(null);
      return;
    }

    if (currentUserId && currentUserId !== userId) {
      get().resetChallengeStateForUser(userId);
      return;
    }

    if (!currentUserId) {
      set({ challengeStateUserId: userId });
    }
  },

  setAssignmentRealtimeStatus: (status, message = "") => {
    set({
      assignmentRealtimeStatus: status,
      assignmentRealtimeMessage: message,
    });
  },

  loadPokerEnginePreview: ({ scenarios: previewScenarios, startIndex = 0 }) => {
    const normalizedStartIndex = Math.min(
      Math.max(startIndex, 0),
      Math.max(previewScenarios.length - 1, 0),
    );
    const activeEvaluation = {
      id: "poker-engine-preview",
      title: "Poker Engine Preview",
      audience: "Local engine development",
      description: "Local preview challenge for poker engine development.",
      version: "preview",
      questions: previewScenarios,
      questionCount: previewScenarios.length,
      fundedThresholdPercent: DEFAULT_FUNDED_THRESHOLD_PERCENT,
      totalPossiblePoints: previewScenarios.reduce(
        (total, scenario) => total + (scenario.points ?? 100),
        0,
      ),
    };
    const currentScenario = previewScenarios[normalizedStartIndex] ?? previewScenarios[0];
    const previewChallenge = {
      id: "poker-engine-preview-assignment",
      assignmentId: "poker-engine-preview-assignment",
      assignmentCode: "PREVIEW001",
      challengeId: "poker-engine-preview",
      title: "Poker Engine Preview",
      evaluationId: activeEvaluation.id,
      status: "In progress",
      purchasedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      score: 0,
      earnedPoints: 0,
      totalPossiblePoints: activeEvaluation.totalPossiblePoints,
      funded: false,
      scenarioResults: [],
      progressResults: [],
      currentQuestionIndex: normalizedStartIndex,
      decisionTimeLimitSeconds: DEFAULT_DECISION_TIME_LIMIT_SECONDS,
      dbBacked: false,
      evaluation: activeEvaluation,
    };

    set({
      evaluations: [activeEvaluation],
      activeEvaluation,
      scenarios: previewScenarios,
      scenarioCategories: getScenarioCategories(previewScenarios),
      selectedCategory: "All",
      mode: "table",
      currentScenarioIndex: normalizedStartIndex,
      currentScenario,
      currentStreet: currentScenario?.street ?? "",
      animationStep: 0,
      selectedAction: null,
      decisionResult: null,
      decisionSecondsRemaining: DEFAULT_DECISION_TIME_LIMIT_SECONDS,
      decisionTimerRunning: false,
      feedbackVisible: false,
      hasPurchasedChallenge: true,
      currentChallenge: previewChallenge,
      activeChallenges: [previewChallenge],
      pastChallenges: [],
      completedChallengeSummary: null,
      stats: initialStats,
      isLoadingData: false,
      challengeDataError: null,
      challengeDataUser: {
        id: "poker-engine-preview-user",
        email: "preview@rabbitstake.local",
      },
      challengeStateUserId: "poker-engine-preview-user",
      assignmentRealtimeStatus: "idle",
      assignmentRealtimeMessage: "Local poker engine preview.",
      lastChallengeSyncAt: new Date().toISOString(),
      lastActiveChallengeCount: 1,
    });
  },

  initializeData: async () => {
    set({ isLoadingData: true, challengeDataError: null });

    let challengeDataUser = null;
    let assignedChallenges = [];
    let pastDatabaseChallenges = [];

    try {
      const dashboard = await getCurrentUserChallengeDashboard();

      challengeDataUser = dashboard.user;
      get().prepareChallengeStateForUser(challengeDataUser?.id ?? null);
      assignedChallenges = dashboard.assignedChallenges;
      pastDatabaseChallenges = dashboard.pastChallenges;
    } catch (error) {
      console.error("Could not load assigned database challenges.", error);

      set({
        isLoadingData: false,
        challengeDataUser,
        lastChallengeSyncAt: new Date().toISOString(),
        lastActiveChallengeCount: 0,
        challengeDataError: getErrorMessage(
          error,
          "Could not load assigned database challenges.",
        ),
      });
      return;
    }

    try {
      const mergedPastChallenges = mergeChallengeLists(
        pastDatabaseChallenges,
        get().pastChallenges,
      );
      const pastChallengeKeys = new Set(
        mergedPastChallenges.map(getChallengeKey).filter(Boolean),
      );

      assignedChallenges = assignedChallenges.filter(
        (challenge) => !pastChallengeKeys.has(getChallengeKey(challenge)),
      );

      if (get().mode === "summary" && get().completedChallengeSummary) {
        set({
          hasPurchasedChallenge: assignedChallenges.length > 0,
          currentChallenge: null,
          activeChallenges: assignedChallenges,
          pastChallenges: mergedPastChallenges,
          selectedAction: null,
          decisionResult: null,
          decisionTimerRunning: false,
          feedbackVisible: false,
          isLoadingData: false,
          challengeDataError: null,
          challengeDataUser,
          lastChallengeSyncAt: new Date().toISOString(),
          lastActiveChallengeCount: assignedChallenges.length,
        });
        return;
      }

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
          pastChallenges: mergedPastChallenges,
          completedChallengeSummary: null,
          stats: restoredStats,
          selectedAction: null,
          decisionResult: null,
          decisionSecondsRemaining:
            currentChallenge.decisionTimeLimitSeconds ??
            DEFAULT_DECISION_TIME_LIMIT_SECONDS,
          decisionTimerRunning: false,
          feedbackVisible: false,
          isLoadingData: false,
          challengeDataError: null,
          challengeDataUser,
          lastChallengeSyncAt: new Date().toISOString(),
          lastActiveChallengeCount: assignedChallenges.length,
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
        pastChallenges: mergedPastChallenges,
        completedChallengeSummary: null,
        stats: initialStats,
        selectedAction: null,
        decisionResult: null,
        decisionSecondsRemaining: DEFAULT_DECISION_TIME_LIMIT_SECONDS,
        decisionTimerRunning: false,
        feedbackVisible: false,
        isLoadingData: false,
        challengeDataError: null,
        challengeDataUser,
        lastChallengeSyncAt: new Date().toISOString(),
        lastActiveChallengeCount: assignedChallenges.length,
      });
      return;
    } catch (error) {
      console.error("Could not prepare assigned database challenges.", error);

      set({
        isLoadingData: false,
        challengeDataUser,
        lastChallengeSyncAt: new Date().toISOString(),
        lastActiveChallengeCount: assignedChallenges.length,
        challengeDataError: getErrorMessage(
          error,
          "Could not prepare assigned database challenges.",
        ),
      });
      return;
    }
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
  },

  startEvaluation: async (category, challengeId) => {
    const { activeChallenges } = get();
    const currentChallenge =
      activeChallenges.find((challenge) => getChallengeKey(challenge) === challengeId) ??
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
        getChallengeKey(challenge) === getChallengeKey(nextChallenge)
          ? nextChallenge
          : challenge,
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
      await get().commitSelectedAction({ timedOut: true });
      return;
    }

    set({ decisionSecondsRemaining: decisionSecondsRemaining - 1 });
  },

  selectAction: (option) => {
    if (!option) return;

    set({
      selectedAction: option,
      decisionResult: null,
      decisionTimerRunning: false,
    });
  },

  clearSelectedAction: () => {
    const { currentScenario, animationStep, decisionSecondsRemaining, decisionResult } =
      get();
    const decisionReady = animationStep >= currentScenario.previousActions.length;

    if (decisionResult) return;

    set({
      selectedAction: null,
      decisionTimerRunning: decisionReady && decisionSecondsRemaining > 0,
    });
  },

  commitSelectedAction: async (config = {}) => {
    const { currentScenario, stats } = get();
    const option = config.timedOut ? null : get().selectedAction;

    if (!config.timedOut && !option) {
      return false;
    }

    if (get().decisionResult && !config.force) {
      return true;
    }

    const alreadyCompleted = stats.completedScenarios.some(
      (completed) => completed.id === currentScenario.id,
    );
    const completedEntry = evaluatePokerDecision(currentScenario, option, config);
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
      selectedAction: config.timedOut ? null : option,
      decisionResult: completedEntry,
      feedbackVisible: true,
      decisionTimerRunning: false,
      stats: nextStats,
      currentChallenge: nextChallenge,
      activeChallenges: nextChallenge
        ? get().activeChallenges.map((challenge) =>
            getChallengeKey(challenge) === getChallengeKey(nextChallenge)
              ? nextChallenge
              : challenge,
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

    return true;
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
        ? mergeChallengeLists([completedChallenge], pastChallenges)
        : pastChallenges;

      if (completedChallenge?.dbBacked && completedChallenge.assignmentId) {
        try {
          await completeAssignedChallenge(completedChallenge.assignmentId, completedChallenge);
          syncedPastChallenges = mergeChallengeLists(
            [completedChallenge],
            await getPastChallengesForCurrentUser(),
            pastChallenges,
          );
        } catch (error) {
          console.error("Could not save assigned challenge result.", error);
        }
      }

      const currentChallengeKey = getChallengeKey(currentChallenge);
      const remainingActiveChallenges = currentChallenge
        ? activeChallenges.filter(
            (challenge) => getChallengeKey(challenge) !== currentChallengeKey,
          )
        : activeChallenges;

      set({
        mode: "summary",
        feedbackVisible: false,
        hasPurchasedChallenge: remainingActiveChallenges.length > 0,
        currentChallenge: null,
        activeChallenges: remainingActiveChallenges,
        pastChallenges: syncedPastChallenges,
        completedChallengeSummary: completedChallenge,
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
      completedChallengeSummary: null,
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
    name: PLAYER_CHALLENGE_STATE_STORAGE_KEY,
    version: 3,
    migrate: (persistedState, version) => {
      if (version < 3 || !persistedState?.challengeStateUserId) {
        return createDefaultChallengeState(null);
      }

      return {
        ...persistedState,
        pastChallenges: [],
      };
    },
    partialize: (state) => ({
      hasPurchasedChallenge: state.activeChallenges.length > 0,
      challengeStateUserId: state.challengeStateUserId,
      currentChallenge: state.currentChallenge,
      activeChallenges: state.activeChallenges,
      pastChallenges: state.pastChallenges,
      completedChallengeSummary: state.completedChallengeSummary,
      mode:
        state.mode === "summary" && state.completedChallengeSummary
          ? "summary"
          : "dashboard",
      activeEvaluation: state.activeEvaluation,
      scenarios: state.scenarios,
      scenarioCategories: state.scenarioCategories,
      currentScenario: state.currentScenario,
      currentScenarioIndex: state.currentScenarioIndex,
      currentStreet: state.currentStreet,
      stats: state.stats,
    }),
  }),
);
