# Rabbitshark Evaluation JSON Format

An uploaded evaluation file must be valid JSON with exactly 25 questions.

## Top-Level Shape

```json
{
  "id": "cash-eval-user-001",
  "title": "Cash Evaluation User 001",
  "audience": "100 BB cash game player",
  "description": "25 poker-table evaluation questions for cash-game fundamentals.",
  "version": "1.0.0",
  "fundedThresholdPercent": 80,
  "questions": []
}
```

Required top-level fields:

- `id`: unique non-empty string. Do not reuse built-in ids.
- `title`: non-empty string.
- `questions`: array containing exactly 25 question objects.

Optional top-level fields:

- `audience`
- `description`
- `version`
- `fundedThresholdPercent`: funding milestone percentage. Defaults to `80`.

## Question Shape

Every item in `questions` must be a complete poker-table scenario:

```json
{
  "id": "cash-eval-user-001-q01",
  "points": 100,
  "title": "BTN vs BB Single Raised Pot",
  "category": "BTN vs BB",
  "gameType": "Cash",
  "tableFormat": "6-max",
  "blinds": "1/2",
  "effectiveStack": 100,
  "hero": {
    "name": "Hero",
    "position": "BTN",
    "cards": ["Ah", "Qs"],
    "stack": 200
  },
  "villains": [
    { "name": "Astra", "position": "SB", "stack": 198, "status": "Folded" },
    { "name": "Vector", "position": "BB", "stack": 200, "status": "Active" },
    { "name": "Kaito", "position": "UTG", "stack": 214, "status": "Folded" },
    { "name": "Nova", "position": "HJ", "stack": 182, "status": "Folded" },
    { "name": "Mika", "position": "CO", "stack": 236, "status": "Folded" }
  ],
  "board": ["Qd", "7c", "2s"],
  "street": "Flop",
  "pot": 13,
  "previousActions": [
    "UTG folds",
    "HJ folds",
    "CO folds",
    "Hero raises BTN to 5",
    "SB folds",
    "BB calls",
    "Flop comes Qd 7c 2s",
    "BB checks"
  ],
  "decisionPoint": "Hero action on flop",
  "strategicConcept": "Range advantage",
  "options": [
    {
      "label": "Check back",
      "type": "Check",
      "points": 40,
      "feedback": "Checking keeps the pot controlled, but this hand benefits from value and protection."
    },
    {
      "label": "Bet 33% pot",
      "type": "Bet small",
      "points": 100,
      "feedback": "Correct. A small continuation bet is efficient because BTN has range advantage."
    },
    {
      "label": "Bet 75% pot",
      "type": "Bet large",
      "points": 65,
      "feedback": "A large bet is playable but less efficient on this dry board."
    },
    {
      "label": "All-in",
      "type": "All-in",
      "points": 0,
      "feedback": "This is a major overplay in a single-raised pot."
    }
  ],
  "explanation": "BTN opens wide and BB defends wide. On Q-7-2 rainbow, BTN has a range advantage and top pair prefers a small value/protection bet."
}
```

## Required Question Fields

- `id`, `title`, `category`, `gameType`, `tableFormat`, `blinds`, `street`, `decisionPoint`, `strategicConcept`, `explanation`: non-empty strings.
- `points`: question max points. Use this to weight harder or more important questions. Defaults to `100` when omitted.
- `effectiveStack`, `pot`: numbers.
- `hero`: object with `name`, `position`, `cards`, and `stack`.
- `hero.cards`: exactly 2 card strings.
- `villains`: non-empty array. Each villain needs `name`, `position`, `stack`, and `status`.
- `board`: array of card strings. Use `[]` for preflop.
- `previousActions`: array of strings. The table animation uses this list.
- `options`: at least 2 action objects. Four is recommended.
- Each option needs `label`, `type`, `points`, and `feedback`.
- Option `points`: action quality score from 0 to 100.
- Awarded points are calculated as `question.points * selectedOption.points / 100`.

## Supported Position/Table Guidance

The current table renderer is tuned for:

- `tableFormat`: `"6-max"` or `"9-max"`
- 6-max positions: `BTN`, `SB`, `BB`, `UTG`, `HJ`, `CO`
- 9-max positions: `BTN`, `SB`, `BB`, `UTG`, `UTG+1`, `MP`, `LJ`, `HJ`, `CO`

## Standard Player Names

Use the same Rabbitshark player names in every scenario.

- Hero name must always be `Hero`.
- 6-max villain names must come from: `Astra`, `Vector`, `Kaito`, `Nova`, `Mika`.
- 9-max villain names must come from: `Astra`, `Vector`, `Kaito`, `Nova`, `Mika`, `Orbit`, `Rin`, `Sol`.
- Do not use generic names like `Player 1`, `Villain`, `BTN Player`, or random new names.
- Positions can change by scenario, but the name pool should stay consistent.

## LLM Prompt Template

Use this when generating files:

```text
Generate a valid Rabbitshark poker evaluation JSON file.

Requirements:
- Return JSON only. No markdown.
- Top-level object fields: id, title, audience, description, version, fundedThresholdPercent, questions.
- questions must contain exactly 25 complete poker-table scenarios.
- fundedThresholdPercent should usually be 80.
- Each question must include: id, points, title, category, gameType, tableFormat, blinds, effectiveStack, hero, villains, board, street, pot, previousActions, decisionPoint, strategicConcept, options, explanation.
- question points must be a positive number. Use higher points for more important questions.
- hero.cards must contain exactly 2 cards.
- board must be [] for preflop, 3 cards for flop, 4 for turn, and 5 for river.
- options must contain 4 actions.
- Each option must include label, type, points, feedback.
- option points must be between 0 and 100, and exactly one option should usually be 100.
- Use 6-max or 9-max tableFormat only.
- Hero name must always be Hero.
- For 6-max, villain names must come from Astra, Vector, Kaito, Nova, Mika.
- For 9-max, villain names must come from Astra, Vector, Kaito, Nova, Mika, Orbit, Rin, Sol.
- Keep previousActions in chronological order and end immediately before the decision point.
- Make every question id unique.
```
