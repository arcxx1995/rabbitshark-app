import { useState } from "react";
import PlayerSeat from "./PlayerSeat";
import PlayingCard from "./PlayingCard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { betChipLayouts } from "../config/betChipLayouts";
import { seatLayouts } from "../config/seatLayouts";
import { tableCenterLayout } from "../config/tableCenterLayout";
import { coordinateStyle } from "../engine/pokerEngine";

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

function ChipMarker({ amount }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-green/35 bg-black/75 px-3 py-1.5 text-green shadow-[0_0_28px_rgba(0,255,171,.24)]">
      <div className="relative h-4 w-7">
        {[0, 1, 2].map((chip) => (
          <span
            key={chip}
            className="absolute left-0 h-2 w-7 rounded-full border border-black/40 bg-green"
            style={{ bottom: chip * 3 }}
          >
            <span className="absolute inset-x-2 top-1 h-px bg-black/30" />
          </span>
        ))}
      </div>
      <span className="font-display text-xs font-black tracking-[0.12em]">
        {amount}
      </span>
    </div>
  );
}

function buildPreviewPlayers(tableFormat) {
  return positionOrders[tableFormat].map((position, index) => ({
    name: playerNames[index],
    position,
    stackBB: index === 0 ? "100 BB" : `${100 + index * 3} BB`,
    cards: ["As", "Kd"],
    isHero: index === 0,
    status: "Active",
  }));
}

export default function ChipLayoutPreview() {
  const [tableFormat, setTableFormat] = useState(getInitialFormat);
  const seats = seatLayouts[tableFormat];
  const chipLayout = betChipLayouts[tableFormat];
  const players = buildPreviewPlayers(tableFormat);

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
                <Badge>{tableFormat}</Badge>
                <Badge>All staged chips</Badge>
                <Badge>src/config/betChipLayouts.js</Badge>
              </div>
              <h1 className="truncate font-display text-sm font-black tracking-tight sm:text-2xl lg:text-3xl">
                Bet Chip Layout Preview
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

          <div className="grid min-h-0 flex-1 place-items-center">
            <div className="relative aspect-[16/10] max-h-[calc(100dvh-72px)] w-full max-w-[1280px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/60 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(0,255,171,.16),transparent_32%)]" />
              <div className="absolute bottom-[25%] left-[9.2%] right-[9.2%] top-[11.8%] rounded-full border border-green/25 table-surface-texture shadow-table ring-[16px] ring-white/5">
                <div
                  className="absolute min-w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/20 px-3 py-1.5 text-center"
                  style={coordinateStyle(tableCenterLayout.pot)}
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                    Pot
                  </div>
                  <div className="font-display text-2xl font-black leading-none text-green sm:text-3xl">
                    0
                  </div>
                </div>

                <div
                  className="absolute flex min-h-20 w-[70%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2.5"
                  style={coordinateStyle(tableCenterLayout.board)}
                >
                  {["Ah", "7d", "2c", "Qs", "4h"].map((card, index) => (
                    <PlayingCard
                      key={card}
                      card={card}
                      boardSmall
                      delay={index * 0.04}
                    />
                  ))}
                </div>
              </div>

              {players.map((player, index) => (
                <PlayerSeat
                  key={`${player.position}-${player.name}`}
                  player={player}
                  position={seats[index]}
                  anchor={seats[index].anchor}
                  cardDock={seats[index].cardDock}
                  isHero={player.isHero}
                  showCards={player.isHero}
                  active
                  isDealer={player.position === "BTN"}
                />
              ))}

              {seats.map((seat, index) => {
                const chipPosition = chipLayout[seat.id];

                return (
                  <div
                    key={`chip-${seat.id}`}
                    className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${chipPosition.x}%`,
                      top: `${chipPosition.y}%`,
                    }}
                  >
                    <ChipMarker amount={`${index + 2} BB`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
