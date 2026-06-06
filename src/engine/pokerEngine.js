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

function getVisibleBoard(scenario, animationStep) {
  const structuredReveal = scenario.revealSteps?.find(
    (step) => step.animationStep === animationStep,
  );

  if (structuredReveal?.boardCount !== undefined) {
    return scenario.board.slice(0, structuredReveal.boardCount);
  }

  const flopIndex = scenario.previousActions.findIndex((action) =>
    action.toLowerCase().includes("flop comes"),
  );
  const turnIndex = scenario.previousActions.findIndex((action) =>
    action.toLowerCase().includes("turn comes"),
  );
  const riverIndex = scenario.previousActions.findIndex((action) =>
    action.toLowerCase().includes("river comes"),
  );

  if (scenario.street === "Preflop") return [];
  if (riverIndex >= 0 && animationStep > riverIndex) return scenario.board.slice(0, 5);
  if (turnIndex >= 0 && animationStep > turnIndex) return scenario.board.slice(0, 4);
  if (flopIndex >= 0 && animationStep > flopIndex) return scenario.board.slice(0, 3);
  if (animationStep >= scenario.previousActions.length) return scenario.board;
  return [];
}

function buildSeatList(scenario) {
  const villains = Array.isArray(scenario.villains) ? scenario.villains : [];
  const players = [
    {
      ...scenario.hero,
      isHero: true,
      stackBB: formatStackInBB(scenario.hero.stack, scenario.blinds),
    },
    ...villains.map((villain) => ({
      ...villain,
      isHero: false,
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

function getActionActor(action, seats) {
  const normalizedAction = action.toLowerCase();

  return seats.find((player) => {
    return (
      normalizedAction.includes(String(player.position).toLowerCase()) ||
      normalizedAction.includes(String(player.name).toLowerCase())
    );
  });
}

const WIN_ACTION_REGEX = /\b(wins?(\s+pot)?|takes?\s+pot|takes?\s+down|collects?)\b/i;

// Returns the single winner seat for a win/collect action, or null when no
// winner can be resolved (action doesn't match, or multiple seats match —
// split pot case). Callers should skip win animation on null.
export function getWinnerForAction(action, seats) {
  if (!WIN_ACTION_REGEX.test(action)) return null;

  const matched = seats.filter((player) => {
    const normalized = action.toLowerCase();
    return (
      normalized.includes(String(player.position).toLowerCase()) ||
      normalized.includes(String(player.name).toLowerCase())
    );
  });

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
  const visibleActions = scenario.previousActions.slice(0, animationStep);
  const latestAction =
    animationStep > 0 ? scenario.previousActions[animationStep - 1] : null;
  const foldEvents = buildFoldEvents(visibleActions, baseSeats);
  const seats = baseSeats.map((player) => {
    const foldEvent = foldEvents.get(player.position);

    if (!foldEvent) return player;

    return {
      ...player,
      status: "Folded",
      folded: true,
      foldAction: foldEvent.action,
      foldActionIndex: foldEvent.actionIndex,
      foldedThisStep: foldEvent.actionIndex === animationStep - 1,
    };
  });
  const tableBets = buildVisibleBets(
    visibleActions,
    seats,
    positions,
    scenario.tableFormat,
  );
  const previousTableBets = buildVisibleBets(
    scenario.previousActions.slice(0, Math.max(animationStep - 1, 0)),
    seats,
    positions,
    scenario.tableFormat,
  );
  const heroIndex = seats.findIndex((player) => player.isHero);
  const winnerSeat = latestAction ? getWinnerForAction(latestAction, seats) : null;
  const winnerIndex = winnerSeat ? seats.indexOf(winnerSeat) : -1;

  return {
    positions,
    seats,
    heroIndex,
    heroPosition: heroIndex >= 0 ? positions[heroIndex] : null,
    visibleBoard: getVisibleBoard(scenario, animationStep),
    decisionReady: animationStep >= scenario.previousActions.length,
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
