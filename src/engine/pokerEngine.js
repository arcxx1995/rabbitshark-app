import { getBetChipPosition } from "../config/betChipLayouts";
import { seatLayouts } from "../config/seatLayouts";
import { tableCenterLayout } from "../config/tableCenterLayout";
import { getBestOption } from "../lib/utils";

const positionOrders = {
  "6-max": ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  "8-max": ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
  "9-max": ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
};

const roundScore = (value) => Math.round(value * 10) / 10;
const ACTION_VERB_REGEX =
  /\b(posts?|antes?|checks?|bets?|calls?|raises?|opens?|limps?|completes?|folds?|3-bets?|4-bets?|5-bets?|jams?|shoves?|wins?|takes?|collects?)\b|all[- ]in/i;

export function coordinateStyle(position) {
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
  };
}

export function parseBigBlind(blinds) {
  const bigBlindToken = String(blinds ?? "").split("/")[1] ?? blinds;
  const normalized = String(bigBlindToken).trim().toLowerCase();
  const multiplier = normalized.endsWith("k") ? 1000 : 1;
  const number = Number.parseFloat(normalized.replace("k", ""));

  return Number.isFinite(number) && number > 0 ? number * multiplier : 1;
}

export function formatStackInBB(stack, blinds) {
  const bigBlind = parseBigBlind(blinds);
  const value = stack / bigBlind;
  const rounded = Number.isInteger(value) ? value : value.toFixed(1);

  return `${rounded} BB`;
}

export function evaluatePokerDecision(scenario, option, config = {}) {
  const selectedOption = option ?? getBestOption(scenario.options);
  const maxPoints = scenario.points ?? 100;
  const earnedPoints = config.timedOut
    ? 0
    : roundScore((maxPoints * selectedOption.points) / 100);

  return {
    id: scenario.id,
    title: scenario.title,
    category: scenario.category,
    selectedAction: config.timedOut ? "Timed out" : selectedOption.label,
    actionScore: config.timedOut ? 0 : selectedOption.points,
    points: earnedPoints,
    maxPoints,
    bestAction: getBestOption(scenario.options).label,
    feedback: config.timedOut
      ? "No action was selected before the decision timer expired."
      : selectedOption.feedback,
    timedOut: Boolean(config.timedOut),
  };
}

function getVisibleBoard(scenario, visibleActions) {
  const visibleStreetActions = visibleActions.filter(isStreetRevealAction);
  const latestStreetAction =
    visibleStreetActions.length > 0
      ? visibleStreetActions[visibleStreetActions.length - 1].toLowerCase()
      : "";

  if (latestStreetAction.includes("river")) return scenario.board.slice(0, 5);
  if (latestStreetAction.includes("turn")) return scenario.board.slice(0, 4);
  if (latestStreetAction.includes("flop")) return scenario.board.slice(0, 3);
  return [];
}

function buildSeatList(scenario) {
  const villains = Array.isArray(scenario.villains) ? scenario.villains : [];
  const players = [
    {
      ...scenario.hero,
      isHero: true,
      status: "Active",
      stackBB: formatStackInBB(scenario.hero.stack, scenario.blinds),
    },
    ...villains.map((villain) => ({
      ...villain,
      isHero: false,
      status: "Active",
      stackBB: formatStackInBB(villain.stack, scenario.blinds),
    })),
  ];
  const positionOrder = positionOrders[scenario.tableFormat];

  if (!positionOrder?.includes(scenario.hero.position)) {
    return players;
  }

  const rotatedPositions = [
    ...positionOrder.slice(positionOrder.indexOf(scenario.hero.position)),
    ...positionOrder.slice(0, positionOrder.indexOf(scenario.hero.position)),
  ];

  return rotatedPositions
    .map((position) => players.find((player) => player.position === position))
    .filter(Boolean);
}

function formatChipAmount(value) {
  if (!Number.isFinite(value) || value <= 0) return null;

  const rounded = Number.isInteger(value) ? value : value.toFixed(1);

  return `${rounded} BB`;
}

function parseNumericActionAmount(action) {
  const numberMatches = action.match(/\d+(?:\.\d+)?/g);
  if (!numberMatches?.length) return null;

  const amount = Number.parseFloat(numberMatches[numberMatches.length - 1]);

  return Number.isFinite(amount) ? amount : null;
}

function getActionWagerAmount(action, currentStreetWager) {
  const normalizedAction = action.toLowerCase();

  if (isStreetRevealAction(action) || /\b(checks?|folds?)\b/.test(normalizedAction)) {
    return null;
  }

  if (/\bcalls?\b/.test(normalizedAction)) {
    return parseNumericActionAmount(action) ?? currentStreetWager;
  }

  if (
    /\b(bets?|raises?|opens?|posts?|limps?|3-bets?|4-bets?|5-bets?|jams?|shoves?|all-in)\b/.test(
      normalizedAction,
    )
  ) {
    return parseNumericActionAmount(action);
  }

  return null;
}

function parsePotAmount(pot) {
  const value = Number.parseFloat(String(pot).replace(/[^\d.]/g, ""));

  return Number.isFinite(value) ? value : null;
}

export function getSelectedActionDisplay(option, scenario) {
  if (!option) return null;

  const label = option.label ?? option.type ?? "Action";
  const numericMatch = label.match(/\d+(?:\.\d+)?/);
  const percentMatch = label.match(/(\d+(?:\.\d+)?)\s*%/);
  const potAmount = parsePotAmount(scenario.pot);

  if (percentMatch && potAmount !== null) {
    const amount = (potAmount * Number.parseFloat(percentMatch[1])) / 100;
    const rounded = Number.isInteger(amount) ? amount : amount.toFixed(1);

    return `${rounded} BB`;
  }

  if (numericMatch) {
    const suffix = /\bx\b/i.test(label) ? "x" : " BB";
    return `${numericMatch[0]}${suffix}`;
  }

  return label;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildActorTokenRegex(token) {
  return new RegExp(`(^|[^a-z0-9+])${escapeRegex(token)}(?=$|[^a-z0-9+])`, "i");
}

function getActorCandidates(seats) {
  return seats
    .flatMap((player) => [
      { player, token: player.name },
      { player, token: player.position },
    ])
    .filter((candidate) => candidate.token)
    .sort((a, b) => String(b.token).length - String(a.token).length);
}

function getActionActor(action, seats) {
  const candidates = getActorCandidates(seats);
  const trimmedAction = String(action).trim();
  const starter = candidates.find(({ token }) =>
    new RegExp(`^${escapeRegex(token)}(?=$|[^a-z0-9+])`, "i").test(trimmedAction),
  );

  if (starter) return starter.player;

  return (
    candidates.find(({ token }) => buildActorTokenRegex(token).test(trimmedAction))
      ?.player ?? null
  );
}

const WIN_ACTION_REGEX = /\b(wins?(\s+pot)?|takes?\s+pot|takes?\s+down|collects?)\b/i;

// Returns the single winner seat for a win/collect action, or null when no
// winner can be resolved (action doesn't match, or multiple seats match —
// split pot case). Callers should skip win animation on null.
export function getWinnerForAction(action, seats) {
  if (!WIN_ACTION_REGEX.test(action)) return null;

  const matched = seats.filter((player) =>
    [player.position, player.name]
      .filter(Boolean)
      .some((token) => buildActorTokenRegex(token).test(action)),
  );

  // Split pot: multiple named players in one win action — skip animation.
  if (matched.length !== 1) return null;

  return matched[0];
}

function getFoldedPositionsForAction(action, seats) {
  const normalizedAction = action.toLowerCase();

  if (!/\bfolds?\b/.test(normalizedAction)) return [];

  if (/\bblinds?\s+folds?\b/.test(normalizedAction)) {
    return ["SB", "BB"].filter((position) =>
      seats.some((player) => player.position === position),
    );
  }

  const actor = getActionActor(action, seats);

  return actor ? [actor.position] : [];
}

function buildFoldEvents(actions, seats) {
  const foldEventsByPosition = new Map();

  actions.forEach((action, index) => {
    getFoldedPositionsForAction(action, seats).forEach((position) => {
      if (!foldEventsByPosition.has(position)) {
        foldEventsByPosition.set(position, { action, actionIndex: index, position });
      }
    });
  });

  return foldEventsByPosition;
}

export function isStreetRevealAction(action) {
  return /\b(flop|turn|river)\b/i.test(action);
}

const ALL_IN_REGEX = /\b(jams?|shoves?|all-in|all in)\b/i;

function getActionType(action) {
  const normalizedAction = action.toLowerCase();

  if (isStreetRevealAction(action)) return "street";
  if (WIN_ACTION_REGEX.test(action)) return "win";
  if (/\bfolds?\b/.test(normalizedAction)) return "fold";
  if (/\bchecks?\b/.test(normalizedAction)) return "check";
  if (/\bcalls?\b/.test(normalizedAction)) return "call";
  if (ALL_IN_REGEX.test(action)) return "all-in";
  if (
    /\b(posts?|bets?|raises?|opens?|limps?|completes?|3-bets?|4-bets?|5-bets?)\b/.test(
      normalizedAction,
    )
  ) {
    return "wager";
  }

  return "info";
}

function shouldSplitActionSegment(segment, seats) {
  const trimmedSegment = segment.trim();

  return ACTION_VERB_REGEX.test(trimmedSegment) && Boolean(getActionActor(trimmedSegment, seats));
}

export function getHandLogAnimationSteps(scenario) {
  const seats = buildSeatList(scenario);

  return (scenario.previousActions ?? []).flatMap((action, sourceIndex) => {
    const segments = String(action)
      .split(/\s*,\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length <= 1 || !segments.every((segment) => shouldSplitActionSegment(segment, seats))) {
      return [{ action, sourceIndex, sourceAction: action }];
    }

    return segments.map((segment) => ({
      action: segment,
      sourceIndex,
      sourceAction: action,
    }));
  });
}

function getBetForAction(action, seats, positions, tableFormat, currentStreetWager) {
  const wagerAmount = getActionWagerAmount(action, currentStreetWager);
  const amount = formatChipAmount(wagerAmount);
  if (!amount) return null;

  const actor = getActionActor(action, seats) ?? seats.find((player) => player.isHero);
  const actorIndex = seats.findIndex((player) => player === actor);
  const origin = positions[actorIndex];

  if (!origin) return null;

  const isAllIn = ALL_IN_REGEX.test(action);

  return {
    id: actor?.position ?? actor?.name ?? `seat-${actorIndex}`,
    amount,
    rawAmount: wagerAmount,
    from: origin,
    spot: getBetChipPosition(tableFormat, origin),
    isAllIn,
    // Raw numeric stack before the all-in shove; null for non-all-in bets.
    stackBefore: isAllIn ? (actor?.stack ?? null) : null,
  };
}

function buildVisibleBets(actions, seats, positions, tableFormat) {
  const bets = new Map();
  let currentStreetWager = null;

  actions.forEach((action) => {
    if (isStreetRevealAction(action)) {
      bets.clear();
      currentStreetWager = null;
      return;
    }

    const bet = getBetForAction(
      action,
      seats,
      positions,
      tableFormat,
      currentStreetWager,
    );
    if (bet) {
      bets.set(bet.id, bet);
      currentStreetWager = Math.max(currentStreetWager ?? 0, bet.rawAmount);
    }
  });

  return [...bets.values()];
}

export function buildSelectedActionMovement(action, heroPosition, tableFormat, scenario) {
  if (!action || !heroPosition) return null;

  return {
    amount: getSelectedActionDisplay(action, scenario),
    target: getBetChipPosition(tableFormat, heroPosition),
  };
}

export function buildPokerTableViewModel(scenario, animationStep) {
  const positions = seatLayouts[scenario.tableFormat] ?? seatLayouts["6-max"];
  const baseSeats = buildSeatList(scenario).slice(0, positions.length);
  const animationSteps = getHandLogAnimationSteps(scenario);
  const visibleSteps = animationSteps.slice(0, animationStep);
  const visibleActions = visibleSteps.map((step) => step.action);
  const latestAction =
    animationStep > 0 ? animationSteps[animationStep - 1]?.action ?? null : null;
  const latestActionActor = latestAction ? getActionActor(latestAction, baseSeats) : null;
  const foldEvents = buildFoldEvents(visibleActions, baseSeats);
  const seats = baseSeats.map((player) => {
    const foldEvent = foldEvents.get(player.position);

    if (!foldEvent) {
      return {
        ...player,
        activeThisStep: latestActionActor?.position === player.position,
      };
    }

    return {
      ...player,
      status: "Folded",
      folded: true,
      foldAction: foldEvent.action,
      foldActionIndex: foldEvent.actionIndex,
      foldedThisStep: foldEvent.actionIndex === animationStep - 1,
      activeThisStep: latestActionActor?.position === player.position,
    };
  });
  const tableBets = buildVisibleBets(
    visibleActions,
    seats,
    positions,
    scenario.tableFormat,
  );
  const previousVisibleActions = animationSteps
    .slice(0, Math.max(animationStep - 1, 0))
    .map((step) => step.action);
  const previousTableBets = buildVisibleBets(
    previousVisibleActions,
    seats,
    positions,
    scenario.tableFormat,
  );
  const heroIndex = seats.findIndex((player) => player.isHero);
  const winnerSeat = latestAction ? getWinnerForAction(latestAction, seats) : null;
  const winnerIndex = winnerSeat ? seats.indexOf(winnerSeat) : -1;
  const latestActorIndex = latestActionActor
    ? seats.findIndex((player) => player.position === latestActionActor.position)
    : -1;

  return {
    positions,
    seats,
    heroIndex,
    heroPosition: heroIndex >= 0 ? positions[heroIndex] : null,
    visibleBoard: getVisibleBoard(scenario, visibleActions),
    decisionReady: animationStep >= animationSteps.length,
    animationStepCount: animationSteps.length,
    visibleLogCount:
      visibleSteps.length > 0
        ? Math.max(...visibleSteps.map((step) => step.sourceIndex)) + 1
        : 0,
    latestAction:
      latestAction !== null
        ? {
            label: latestAction,
            type: getActionType(latestAction),
            actor: latestActionActor,
            sourceIndex: animationSteps[animationStep - 1]?.sourceIndex ?? null,
            position: latestActorIndex >= 0 ? positions[latestActorIndex] : tableCenterLayout.pot,
          }
        : null,
    tableBets,
    chipAnimation:
      latestAction && isStreetRevealAction(latestAction) && previousTableBets.length > 0
        ? {
            type: "collect",
            bets: previousTableBets,
            target: tableCenterLayout.pot,
          }
        : null,
    winAnimation:
      winnerSeat && winnerIndex >= 0
        ? {
            type: "win",
            winner: winnerSeat,
            winnerPosition: positions[winnerIndex],
            potPosition: tableCenterLayout.pot,
          }
        : null,
  };
}
