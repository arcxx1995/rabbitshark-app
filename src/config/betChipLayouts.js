const fallbackTableCenter = { x: 53, y: 50 };

export const betChipLayouts = {
  "6-max": {
    seat_0_hero: { x: 48, y: 60 },
    seat_1_left_lower: { x: 21.2, y: 30.2 },
    seat_2_left_upper: { x: 21.2, y: 55.9 },
    seat_3_top: { x: 48, y: 24 },
    seat_4_right_lower: { x: 70.8, y: 30.2 },
    seat_5_right_upper: { x: 70.8, y: 55.9 },
  },
  "8-max": {
    seat_0_hero: { x: 48, y: 60 },
    seat_1_bottom_right: { x: 69.8, y: 61.8 },
    seat_2_right_mid: { x: 73.0, y: 42.0 },
    seat_3_right_upper: { x: 69.8, y: 21.7 },
    seat_4_top_right: { x: 48.0, y: 21.7 },
    seat_5_top_left: { x: 36.0, y: 24.4 },
    seat_6_left_upper: { x: 25.8, y: 21.7 },
    seat_7_left_mid: { x: 20.0, y: 42.0 },
    seat_8_bottom_left: { x: 27.4, y: 61.8 },
  },
  "9-max": {
    seat_0_hero: { x: 48, y: 60 },
    seat_1_bottom_right: { x: 68.4, y: 61.8 },
    seat_2_right_mid: { x: 73.0, y: 50.2 },
    seat_3_right_upper: { x: 71.0, y: 27.9 },
    seat_4_top_right: { x: 58.6, y: 20.7 },
    seat_5_top_left: { x: 33.2, y: 20.7 },
    seat_6_left_upper: { x: 20.0, y: 27.9 },
    seat_7_left_mid: { x: 20.0, y: 50.2 },
    seat_8_bottom_left: { x: 27.4, y: 61.8 },
  },
};

export function getBetChipPosition(tableFormat, seatPosition) {
  const configuredPosition = betChipLayouts[tableFormat]?.[seatPosition.id];

  if (configuredPosition) {
    return configuredPosition;
  }

  // Fallback fires when a seat id has no explicit entry in betChipLayouts —
  // e.g. a new table format was added to seatLayouts without a matching chip
  // layout, or a seat position id was renamed. The chip is placed 42% of the
  // way from the seat toward the table center, which keeps it roughly on-felt.
  return {
    x: seatPosition.x + (fallbackTableCenter.x - seatPosition.x) * 0.42,
    y: seatPosition.y + (fallbackTableCenter.y - seatPosition.y) * 0.42,
  };
}
