import { scenarios as scenarioTemplates } from "../data/scenarios";
import { cashFoundationsEvaluation } from "../data/evaluations/cash-foundations-001";
import { tournamentIcmEvaluation } from "../data/evaluations/tournament-icm-001";

export const ACTIVE_EVALUATION_STORAGE_KEY = "rabbitstake.activeEvaluationId";
export const UPLOADED_EVALUATIONS_STORAGE_KEY = "rabbitstake.uploadedEvaluations";
export const REQUIRED_QUESTION_COUNT = 25;
export const DEFAULT_QUESTION_POINTS = 100;
export const DEFAULT_FUNDED_THRESHOLD_PERCENT = 80;

export const STANDARD_PLAYER_NAMES_BY_TABLE_FORMAT = {
  "6-max": ["Astra", "Vector", "Kaito", "Nova", "Mika"],
  "9-max": ["Astra", "Vector", "Kaito", "Nova", "Mika", "Orbit", "Rin", "Sol"],
};

const evaluationFiles = [
  cashFoundationsEvaluation,
  tournamentIcmEvaluation,
];

const scenarioTemplateMap = new Map(
  scenarioTemplates.map((scenario) => [scenario.id, scenario]),
);

function readStoredEvaluationId() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(ACTIVE_EVALUATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readUploadedEvaluations() {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(UPLOADED_EVALUATIONS_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function getAllEvaluationFiles() {
  const filesById = new Map(evaluationFiles.map((file) => [file.id, file]));

  readUploadedEvaluations().forEach((file) => {
    if (!evaluationFiles.some((builtInFile) => builtInFile.id === file.id)) {
      filesById.set(file.id, file);
    }
  });

  return [...filesById.values()];
}

function writeUploadedEvaluations(evaluations) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      UPLOADED_EVALUATIONS_STORAGE_KEY,
      JSON.stringify(evaluations),
    );
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function writeStoredEvaluationId(evaluationId) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ACTIVE_EVALUATION_STORAGE_KEY, evaluationId);
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function requireString(value, path) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }
}

function requireNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number.`);
  }
}

function requireOptionalPositiveNumber(value, path) {
  if (value === undefined) return;
  requireNumber(value, path);

  if (value <= 0) {
    throw new Error(`${path} must be greater than 0.`);
  }
}

function requireStringArray(value, path, expectedLength) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${path} must be an array of strings.`);
  }

  if (expectedLength && value.length !== expectedLength) {
    throw new Error(`${path} must contain exactly ${expectedLength} entries.`);
  }
}

function requirePlayer(value, path, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }

  requireString(value.name, `${path}.name`);
  requireString(value.position, `${path}.position`);
  requireNumber(value.stack, `${path}.stack`);

  if (options.hero) {
    if (value.name !== "Hero") {
      throw new Error(`${path}.name must be "Hero".`);
    }

    requireStringArray(value.cards, `${path}.cards`, 2);
  }

  if (!options.hero) {
    const standardNames =
      STANDARD_PLAYER_NAMES_BY_TABLE_FORMAT[options.tableFormat] ?? [];

    if (standardNames.length > 0 && !standardNames.includes(value.name)) {
      throw new Error(
        `${path}.name must use a standard Rabbitstake player name: ${standardNames.join(", ")}.`,
      );
    }

    requireString(value.status, `${path}.status`);
  }
}

function validateScenarioQuestion(question, path) {
  requireString(question.id, `${path}.id`);
  requireOptionalPositiveNumber(question.points, `${path}.points`);
  requireString(question.title, `${path}.title`);
  requireString(question.category, `${path}.category`);
  requireString(question.gameType, `${path}.gameType`);
  requireString(question.tableFormat, `${path}.tableFormat`);
  requireString(question.blinds, `${path}.blinds`);
  requireNumber(question.effectiveStack, `${path}.effectiveStack`);
  requirePlayer(question.hero, `${path}.hero`, { hero: true });

  if (!Array.isArray(question.villains) || question.villains.length === 0) {
    throw new Error(`${path}.villains must be a non-empty array.`);
  }

  question.villains.forEach((villain, index) => {
    requirePlayer(villain, `${path}.villains[${index}]`, {
      tableFormat: question.tableFormat,
    });
  });

  requireStringArray(question.board, `${path}.board`);
  requireString(question.street, `${path}.street`);
  requireNumber(question.pot, `${path}.pot`);
  requireStringArray(question.previousActions, `${path}.previousActions`);
  requireString(question.decisionPoint, `${path}.decisionPoint`);
  requireString(question.strategicConcept, `${path}.strategicConcept`);

  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${path}.options must contain at least 2 actions.`);
  }

  question.options.forEach((option, index) => {
    requireString(option.label, `${path}.options[${index}].label`);
    requireString(option.type, `${path}.options[${index}].type`);
    requireNumber(option.points, `${path}.options[${index}].points`);
    requireString(option.feedback, `${path}.options[${index}].feedback`);

    if (option.points < 0 || option.points > 100) {
      throw new Error(`${path}.options[${index}].points must be between 0 and 100.`);
    }
  });

  requireString(question.explanation, `${path}.explanation`);
}

function resolveQuestion(evaluationFile, question, index) {
  if (!question.sourceScenarioId) {
    validateScenarioQuestion(question, `questions[${index}]`);

    return {
      ...question,
      points: question.points ?? DEFAULT_QUESTION_POINTS,
      evaluationId: evaluationFile.id,
      evaluationTitle: evaluationFile.title,
      questionNumber: index + 1,
    };
  }

  const template = scenarioTemplateMap.get(question.sourceScenarioId);

  if (!template) {
    throw new Error(
      `Evaluation ${evaluationFile.id} question ${question.id} references missing scenario ${question.sourceScenarioId}.`,
    );
  }

  return {
    ...template,
    ...question.overrides,
    id: question.id,
    points: question.points ?? question.overrides?.points ?? DEFAULT_QUESTION_POINTS,
    title: question.title ?? template.title,
    evaluationId: evaluationFile.id,
    evaluationTitle: evaluationFile.title,
    questionNumber: index + 1,
    sourceScenarioId: question.sourceScenarioId,
  };
}

export function resolveEvaluationFile(evaluationFile) {
  if (!evaluationFile?.id || !Array.isArray(evaluationFile.questions)) {
    throw new Error("Evaluation files must include an id and a questions array.");
  }

  requireString(evaluationFile.id, "id");
  requireString(evaluationFile.title, "title");
  requireOptionalPositiveNumber(
    evaluationFile.fundedThresholdPercent,
    "fundedThresholdPercent",
  );

  if (
    evaluationFile.fundedThresholdPercent !== undefined &&
    evaluationFile.fundedThresholdPercent > 100
  ) {
    throw new Error("fundedThresholdPercent must be between 0 and 100.");
  }

  if (evaluationFile.questions.length !== REQUIRED_QUESTION_COUNT) {
    throw new Error(
      `Evaluation ${evaluationFile.id} must contain exactly ${REQUIRED_QUESTION_COUNT} questions.`,
    );
  }

  const questions = evaluationFile.questions.map((question, index) =>
    resolveQuestion(evaluationFile, question, index),
  );

  return {
    ...evaluationFile,
    audience: evaluationFile.audience ?? "Uploaded evaluation",
    description: evaluationFile.description ?? "",
    version: evaluationFile.version ?? "1.0.0",
    fundedThresholdPercent:
      evaluationFile.fundedThresholdPercent ?? DEFAULT_FUNDED_THRESHOLD_PERCENT,
    totalPossiblePoints: questions.reduce((total, question) => total + question.points, 0),
    questions,
    questionCount: questions.length,
  };
}

export function getEvaluationFiles() {
  return getAllEvaluationFiles().map((file) => ({
    id: file.id,
    title: file.title,
    audience: file.audience ?? "Uploaded evaluation",
    description: file.description ?? "",
    version: file.version ?? "1.0.0",
    questionCount: file.questions.length,
    fundedThresholdPercent:
      file.fundedThresholdPercent ?? DEFAULT_FUNDED_THRESHOLD_PERCENT,
    isValid: file.questions.length === REQUIRED_QUESTION_COUNT,
    source: evaluationFiles.some((builtInFile) => builtInFile.id === file.id)
      ? "Built-in"
      : "Uploaded JSON",
  }));
}

export function getEvaluationById(evaluationId) {
  const allFiles = getAllEvaluationFiles();
  const file = allFiles.find((item) => item.id === evaluationId) ?? evaluationFiles[0];
  return resolveEvaluationFile(file);
}

export function getActiveEvaluation() {
  return getEvaluationById(readStoredEvaluationId());
}

export function getActiveEvaluationId() {
  return getActiveEvaluation().id;
}

export function setActiveEvaluationId(evaluationId) {
  const evaluation = getEvaluationById(evaluationId);
  writeStoredEvaluationId(evaluation.id);
  return evaluation;
}

export function saveUploadedEvaluation(evaluationFile) {
  const normalizedEvaluation = resolveEvaluationFile(evaluationFile);

  if (evaluationFiles.some((file) => file.id === normalizedEvaluation.id)) {
    throw new Error(
      `Evaluation id ${normalizedEvaluation.id} is reserved by a built-in file. Use a unique id for uploaded JSON.`,
    );
  }

  const uploadedEvaluations = readUploadedEvaluations();
  const nextEvaluations = [
    ...uploadedEvaluations.filter((evaluation) => evaluation.id !== normalizedEvaluation.id),
    evaluationFile,
  ];

  writeUploadedEvaluations(nextEvaluations);
  writeStoredEvaluationId(normalizedEvaluation.id);

  return normalizedEvaluation;
}

export function getScenarioCategories(scenarios) {
  const categories = new Set(["All"]);

  scenarios.forEach((scenario) => {
    categories.add(scenario.street);
    categories.add(scenario.category);
  });

  return [...categories];
}
