import { scenarios } from "../data/scenarios";

const GENERATED_EVALUATION_VERSION = "1.0.0";
const GENERATED_QUESTION_COUNT = 25;
const DEFAULT_GENERATED_TITLE = "Rabbitshark 25 Question Evaluation";
const DEFAULT_AUDIENCE = "Poker evaluation challenge";
const DEFAULT_DESCRIPTION =
  "A generated 25-question Rabbitshark poker evaluation built from validated Poker Engine scenarios.";

function createGeneratedId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);

  return `generated-evaluation-${timestamp}-${randomPart}`;
}

function shuffle(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [
      shuffledItems[swapIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

function buildQuestionPool() {
  const pool = [];

  while (pool.length < GENERATED_QUESTION_COUNT) {
    pool.push(...shuffle(scenarios));
  }

  return pool.slice(0, GENERATED_QUESTION_COUNT);
}

function cloneScenario(scenario) {
  return JSON.parse(JSON.stringify(scenario));
}

export function generateEvaluationFile(options = {}) {
  const evaluationId = createGeneratedId();
  const title = options.title?.trim() || DEFAULT_GENERATED_TITLE;
  const questionPool = buildQuestionPool();

  return {
    id: evaluationId,
    title,
    audience: options.audience?.trim() || DEFAULT_AUDIENCE,
    description: options.description?.trim() || DEFAULT_DESCRIPTION,
    version: GENERATED_EVALUATION_VERSION,
    fundedThresholdPercent: 80,
    questions: questionPool.map((scenario, index) => {
      const questionNumber = String(index + 1).padStart(2, "0");
      const question = cloneScenario(scenario);

      return {
        ...question,
        id: `${evaluationId}-q${questionNumber}`,
        title: `Q${questionNumber} - ${question.title}`,
        points: 100,
      };
    }),
  };
}
