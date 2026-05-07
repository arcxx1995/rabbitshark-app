export const scenarioCategories = [
  "All",
  "Preflop",
  "Flop",
  "Turn",
  "River",
  "3-bet pots",
  "Blind vs blind",
  "BTN vs BB",
  "Tournament ICM",
];

export const scenarios = [
  {
    id: "scenario_001",
    title: "BTN vs BB Single Raised Pot",
    category: "BTN vs BB",
    gameType: "Cash",
    tableFormat: "6-max",
    blinds: "1/2",
    effectiveStack: 100,
    hero: {
      name: "Hero",
      position: "BTN",
      cards: ["Ah", "Qs"],
      stack: 200,
    },
    villains: [
      { name: "Astra", position: "SB", stack: 198, status: "Folded" },
      { name: "Vector", position: "BB", stack: 200, status: "Active" },
      { name: "Kaito", position: "UTG", stack: 214, status: "Folded" },
      { name: "Nova", position: "HJ", stack: 182, status: "Folded" },
      { name: "Mika", position: "CO", stack: 236, status: "Folded" },
    ],
    board: ["Qd", "7c", "2s"],
    street: "Flop",
    pot: 13,
    previousActions: [
      "UTG folds",
      "HJ folds",
      "CO folds",
      "Hero raises BTN to 5",
      "SB folds",
      "BB calls",
      "Flop comes Qd 7c 2s",
      "BB checks",
    ],
    decisionPoint: "Hero action on flop",
    strategicConcept: "Range advantage",
    options: [
      {
        label: "Check back",
        type: "Check",
        points: 40,
        feedback:
          "Checking keeps the pot controlled, but this hand benefits from value and protection on a board Hero can c-bet frequently.",
      },
      {
        label: "Bet 33% pot",
        type: "Bet small",
        points: 100,
        feedback:
          "Correct. A small continuation bet is efficient because BTN has range advantage and top pair gets called by worse queens, pairs, and backdoor floats.",
      },
      {
        label: "Bet 75% pot",
        type: "Bet large",
        points: 65,
        feedback:
          "A large bet is not a disaster, but it is less efficient on a dry board where Hero wants to bet a broad range.",
      },
      {
        label: "All-in",
        type: "All-in",
        points: 0,
        feedback: "This is a major overplay in a single-raised pot.",
      },
    ],
    explanation:
      "BTN opens a wide range and BB defends wide. On Q-7-2 rainbow, BTN keeps a strong range advantage while BB has many unpaired hands. Top pair with a strong kicker wants thin value and protection without polarizing too much, so the small c-bet is the highest-frequency GTO action.",
  },
  {
    id: "scenario_002",
    title: "CO vs BTN 3-Bet Pot",
    category: "3-bet pots",
    gameType: "Cash",
    tableFormat: "6-max",
    blinds: "2/5",
    effectiveStack: 100,
    hero: {
      name: "Hero",
      position: "CO",
      cards: ["Js", "Jd"],
      stack: 500,
    },
    villains: [
      { name: "Astra", position: "BTN", stack: 500, status: "Active" },
      { name: "Vector", position: "SB", stack: 505, status: "Folded" },
      { name: "Kaito", position: "BB", stack: 490, status: "Folded" },
      { name: "Nova", position: "UTG", stack: 620, status: "Folded" },
      { name: "Mika", position: "HJ", stack: 470, status: "Folded" },
    ],
    board: ["8h", "6h", "2c"],
    street: "Flop",
    pot: 87,
    previousActions: [
      "UTG folds",
      "HJ folds",
      "Hero opens CO to 12",
      "BTN 3-bets to 42",
      "Blinds fold",
      "Hero calls",
      "Flop comes 8h 6h 2c",
      "Hero checks",
      "BTN bets 29",
    ],
    decisionPoint: "Hero response to small c-bet",
    strategicConcept: "Equity realization",
    options: [
      {
        label: "Fold",
        type: "Fold",
        points: 5,
        feedback:
          "Folding an overpair to a small c-bet is far too tight and gives up substantial equity.",
      },
      {
        label: "Call",
        type: "Call",
        points: 100,
        feedback:
          "Correct. Calling protects the checking range and realizes equity against BTN's high-frequency small bet.",
      },
      {
        label: "Raise 3x",
        type: "Raise",
        points: 55,
        feedback:
          "Raising can deny equity, but JJ is usually strong enough to call and not eager to isolate against stronger overpairs.",
      },
      {
        label: "All-in",
        type: "All-in",
        points: 15,
        feedback:
          "Jamming over a small c-bet is too polar and folds out hands you dominate.",
      },
    ],
    explanation:
      "In 3-bet pots, the in-position aggressor uses small bets often. JJ has strong showdown value, blocks some value combos, and does not need immediate protection badly enough to raise. Calling keeps weaker hands in and maintains a resilient check-call range.",
  },
  {
    id: "scenario_003",
    title: "SB vs BB Limped Blind Battle",
    category: "Blind vs blind",
    gameType: "Cash",
    tableFormat: "6-max",
    blinds: "1/2",
    effectiveStack: 60,
    hero: {
      name: "Hero",
      position: "BB",
      cards: ["Kc", "9c"],
      stack: 120,
    },
    villains: [
      { name: "Astra", position: "SB", stack: 120, status: "Active" },
      { name: "Vector", position: "BTN", stack: 190, status: "Folded" },
      { name: "Kaito", position: "UTG", stack: 140, status: "Folded" },
      { name: "Nova", position: "HJ", stack: 110, status: "Folded" },
      { name: "Mika", position: "CO", stack: 220, status: "Folded" },
    ],
    board: [],
    street: "Preflop",
    pot: 4,
    previousActions: [
      "UTG folds",
      "HJ folds",
      "CO folds",
      "BTN folds",
      "SB completes to 2",
    ],
    decisionPoint: "Hero action versus SB limp",
    strategicConcept: "Position",
    options: [
      {
        label: "Check",
        type: "Check",
        points: 70,
        feedback:
          "Checking realizes position and keeps the pot manageable, but K9 suited is strong enough to attack some limp ranges.",
      },
      {
        label: "Raise to 8",
        type: "Raise",
        points: 100,
        feedback:
          "Correct. K9 suited performs well as an isolation raise in position against a small blind limp.",
      },
      {
        label: "Raise to 16",
        type: "Raise",
        points: 45,
        feedback:
          "The hand wants to raise, but this sizing risks too much with a non-premium holding.",
      },
      {
        label: "All-in",
        type: "All-in",
        points: 10,
        feedback:
          "Jamming 60 big blinds over a limp is a severe overbet and burns value.",
      },
    ],
    explanation:
      "Blind versus blind ranges are wide and position matters heavily. K9 suited has playability, blocker value, and equity advantage against many completing ranges, so raising a normal isolation size is preferred.",
  },
  {
    id: "scenario_004",
    title: "Tournament Bubble ICM Spot",
    category: "Tournament ICM",
    gameType: "Tournament",
    tableFormat: "9-max",
    blinds: "5k/10k/10k",
    effectiveStack: 18,
    hero: {
      name: "Hero",
      position: "CO",
      cards: ["Ad", "Ts"],
      stack: 180000,
    },
    villains: [
      { name: "Astra", position: "BTN", stack: 145000, status: "Active" },
      { name: "Vector", position: "SB", stack: 430000, status: "Active" },
      { name: "Kaito", position: "BB", stack: 76000, status: "Active" },
      { name: "Nova", position: "UTG", stack: 210000, status: "Folded" },
      { name: "Mika", position: "UTG+1", stack: 98000, status: "Folded" },
      { name: "Orbit", position: "LJ", stack: 310000, status: "Folded" },
      { name: "Rin", position: "HJ", stack: 260000, status: "Folded" },
      { name: "Sol", position: "MP", stack: 120000, status: "Folded" },
    ],
    board: [],
    street: "Preflop",
    pot: 25000,
    previousActions: [
      "18 players remain, 17 paid",
      "UTG folds",
      "UTG+1 folds",
      "MP folds",
      "LJ folds",
      "HJ folds",
    ],
    decisionPoint: "Hero action on tournament bubble",
    strategicConcept: "ICM",
    options: [
      {
        label: "Fold",
        type: "Fold",
        points: 35,
        feedback:
          "Folding avoids ICM risk, but ATo in the cutoff is too strong to pure fold at 18 big blinds when shorter stacks are in the blinds.",
      },
      {
        label: "Min-raise",
        type: "Bet small",
        points: 100,
        feedback:
          "Correct. Min-raising pressures covered stacks while preserving fold equity and avoiding unnecessary all-in risk.",
      },
      {
        label: "Open jam",
        type: "All-in",
        points: 60,
        feedback:
          "Jamming is profitable in chips, but ICM makes risking the full stack less attractive than a small open.",
      },
      {
        label: "Raise 4x",
        type: "Bet large",
        points: 20,
        feedback:
          "Large non-all-in sizing commits too much and performs poorly under ICM pressure.",
      },
    ],
    explanation:
      "Near the bubble, stack preservation has monetary value. Hero can pressure the button and short big blind with a small open while retaining flexibility against the big stack in the small blind. ICM favors controlled aggression over high-variance commitment.",
  },
  {
    id: "scenario_005",
    title: "Turn Probe Facing Capped Range",
    category: "Turn",
    gameType: "Cash",
    tableFormat: "6-max",
    blinds: "1/2",
    effectiveStack: 100,
    hero: {
      name: "Hero",
      position: "BB",
      cards: ["9s", "8s"],
      stack: 190,
    },
    villains: [
      { name: "Astra", position: "BTN", stack: 205, status: "Active" },
      { name: "Vector", position: "SB", stack: 198, status: "Folded" },
      { name: "Kaito", position: "UTG", stack: 214, status: "Folded" },
      { name: "Nova", position: "HJ", stack: 182, status: "Folded" },
      { name: "Mika", position: "CO", stack: 236, status: "Folded" },
    ],
    board: ["Td", "7s", "2c", "6h"],
    street: "Turn",
    pot: 18,
    previousActions: [
      "BTN opens to 5",
      "SB folds",
      "Hero calls BB",
      "Flop comes Td 7s 2c",
      "Hero checks",
      "BTN checks back",
      "Turn comes 6h",
    ],
    decisionPoint: "Hero action after BTN checks flop",
    strategicConcept: "Nut advantage",
    options: [
      {
        label: "Check",
        type: "Check",
        points: 55,
        feedback:
          "Checking is playable, but Hero now has a straight and BTN's flop check caps many strong hands.",
      },
      {
        label: "Bet 66% pot",
        type: "Bet medium",
        points: 100,
        feedback:
          "Correct. Hero improves to the nuts and can use a healthy sizing against BTN's capped range.",
      },
      {
        label: "Bet 25% pot",
        type: "Bet small",
        points: 70,
        feedback:
          "Small betting gains value but misses leverage against a range that often contains one-pair hands.",
      },
      {
        label: "All-in",
        type: "All-in",
        points: 25,
        feedback:
          "Overbet jamming is too large for the stack-to-pot ratio and loses value from dominated hands.",
      },
    ],
    explanation:
      "When BTN checks back a dry flop, many overpairs and strong top-pair hands are discounted. The turn gives BB a strong nut-advantage hand. Betting medium to large extracts value and starts building a pot before river scare cards arrive.",
  },
  {
    id: "scenario_006",
    title: "River Bluff Catch Pot Odds",
    category: "River",
    gameType: "Cash",
    tableFormat: "6-max",
    blinds: "2/5",
    effectiveStack: 120,
    hero: {
      name: "Hero",
      position: "BB",
      cards: ["Ac", "Jc"],
      stack: 415,
    },
    villains: [
      { name: "Astra", position: "CO", stack: 590, status: "Active" },
      { name: "Vector", position: "SB", stack: 500, status: "Folded" },
      { name: "Kaito", position: "BTN", stack: 480, status: "Folded" },
      { name: "Nova", position: "UTG", stack: 650, status: "Folded" },
      { name: "Mika", position: "HJ", stack: 440, status: "Folded" },
    ],
    board: ["Jd", "7d", "4s", "2c", "7h"],
    street: "River",
    pot: 155,
    previousActions: [
      "CO opens to 12",
      "BTN folds",
      "SB folds",
      "Hero calls BB",
      "Flop comes Jd 7d 4s",
      "Hero checks, CO bets 10, Hero calls",
      "Turn comes 2c",
      "Hero checks, CO bets 45, Hero calls",
      "River comes 7h",
      "Hero checks",
      "CO bets 110",
    ],
    decisionPoint: "Hero response to river barrel",
    strategicConcept: "MDF",
    options: [
      {
        label: "Fold",
        type: "Fold",
        points: 45,
        feedback:
          "Folding is conservative, but AJ blocks value and sits high enough in Hero's range to defend at meaningful frequency.",
      },
      {
        label: "Call",
        type: "Call",
        points: 100,
        feedback:
          "Correct. AJ is a strong bluff catcher, blocks some top-pair value, and meets minimum-defense needs against this sizing.",
      },
      {
        label: "Raise",
        type: "Raise",
        points: 15,
        feedback:
          "Raising turns showdown value into a bluff and rarely gets called by worse.",
      },
      {
        label: "All-in",
        type: "All-in",
        points: 0,
        feedback:
          "All-in is an unnecessary bluff with a hand that has clear bluff-catching value.",
      },
    ],
    explanation:
      "Facing a 110 bet into 155, Hero needs to defend enough hands to avoid overfolding. AJ is above many weaker jacks and pocket pairs, and the ace reduces some strong Ax diamond bluff/value combinations. Calling is the best GTO response.",
  },
];
