import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { getBetChipPosition } from "../config/betChipLayouts";
import { buildPokerTableViewModel } from "../engine/pokerEngine";
import { PokerTableSurface } from "./PokerTable";
import ScenarioLog from "./ScenarioLog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const tableFormats = ["6-max", "8-max", "9-max"];
const positionOrders = {
  "6-max": ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  "8-max": ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
  "9-max": ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
};
const playerNames = ["Hero", "Astra", "Vector", "Kaito", "Nova", "Mika", "Orbit", "Rin", "Sol"];

function getInitialFormat() {
  if (typeof window === "undefined") return "8-max";

  const format = new URLSearchParams(window.location.search).get("format");

  return tableFormats.includes(format) ? format : "8-max";
}

function buildPreviewScenario(tableFormat) {
  const positions = positionOrders[tableFormat];
  const players = positions.map((position, index) => ({
    name: playerNames[index],
    position,
    stack: (100 + index * 3) * 100,
    cards: ["As", "Kd"],
    status: "Active",
  }));

  return {
    id: `bet-chip-layout-${tableFormat}`,
    title: `${tableFormat} Bet Chip Layout`,
    category: "Poker Engine Preview",
    gameType: "No-Limit Hold'em",
    tableFormat,
    blinds: "50/100",
    effectiveStack: 100,
    pot: "0 BB",
    street: "Flop",
    board: ["Ah", "7d", "2c"],
    hero: players[0],
    villains: players.slice(1),
    previousActions: [
      "Preview mode: all player bet-chip positions are staged on the table.",
      "Edit src/config/betChipLayouts.js to reposition these markers.",
    ],
    options: [
      { label: "Fold", points: 0, feedback: "Preview only." },
      { label: "Call", points: 50, feedback: "Preview only." },
      { label: "Raise to 3BB", points: 100, feedback: "Preview only." },
    ],
    points: 100,
  };
}

function buildForcedTableBets(tableView, tableFormat) {
  return tableView.positions.map((position, index) => ({
    id: position.id,
    amount: `${index + 2} BB`,
    rawAmount: index + 2,
    from: position,
    spot: getBetChipPosition(tableFormat, position),
  }));
}

export default function ChipLayoutPreview() {
  const [tableFormat, setTableFormat] = useState(getInitialFormat);

  const scenario = useMemo(() => buildPreviewScenario(tableFormat), [tableFormat]);
  const tableView = useMemo(() => {
    const baseTableView = buildPokerTableViewModel(scenario, 1);

    return {
      ...baseTableView,
      decisionReady: true,
      tableBets: buildForcedTableBets(baseTableView, tableFormat),
      chipAnimation: null,
      visibleBoard: scenario.board,
    };
  }, [scenario, tableFormat]);

  const setFormat = (format) => {
    setTableFormat(format);

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("format", format);
      window.history.replaceState(null, "", nextUrl);
    }
  };

  return (
    <main className="h-dvh overflow-hidden bg-aurora text-green">
      <section className="grid-shell h-full px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="mx-auto flex h-full max-w-[1680px] flex-col gap-2 sm:gap-3">
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 hidden flex-wrap gap-2 sm:flex">
                <Badge>PREVIEW001</Badge>
                <Badge>1/1</Badge>
                <Badge>{scenario.gameType}</Badge>
                <Badge>{tableFormat}</Badge>
                <Badge>{scenario.blinds}</Badge>
                <Badge>src/config/betChipLayouts.js</Badge>
              </div>
              <h1 className="truncate font-display text-sm font-black tracking-tight sm:text-2xl lg:text-3xl">
                {scenario.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {tableFormats.map((format) => (
                <Button
                  key={format}
                  className="h-9 px-3 text-[10px] sm:h-11 sm:px-5 sm:text-sm"
                  variant={format === tableFormat ? "default" : "secondary"}
                  onClick={() => setFormat(format)}
                >
                  {format}
                </Button>
              ))}
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_360px]">
            <section className="grid min-h-0 place-items-center">
              <PokerTableSurface
                scenario={scenario}
                tableView={tableView}
                animationStep={1}
                isDecisionReady
                animateTableBets={false}
                onSelectAction={() => {}}
                onClearAction={() => {}}
                onContinue={() => {}}
              />
            </section>

            <aside className="hidden min-h-0 space-y-3 overflow-hidden xl:block">
              <div className="rounded-2xl border border-green/18 bg-black/35 p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-green/12 text-green">
                    <SlidersHorizontal size={19} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                      Layout Source
                    </p>
                    <p className="font-display text-sm font-black text-green">
                      src/config/betChipLayouts.js
                    </p>
                  </div>
                </div>
              </div>
              <ScenarioLog
                actions={scenario.previousActions}
                visibleCount={scenario.previousActions.length}
              />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
