const fallbackTableCenter = { x: 53, y: 50 };

export const betChipLayouts = {
  "6-max": {
    seat_0_hero: { x: 49.5, y: 63.8 },
    seat_1_left_lower: { x: 25.6, y: 36.5 },
    seat_2_left_upper: { x: 25.6, y: 55.9 },
    seat_3_top: { x: 49.5, y: 27.1 },
    seat_4_right_lower: { x: 71.2, y: 36.5 },
    seat_5_right_upper: { x: 71.2, y: 55.9 },
  },
  "8-max": {
    seat_0_hero: { x: 49.3, y: 64.4 },
    seat_1_bottom_right: { x: 64.4, y: 65.8 },
    seat_2_right_mid: { x: 71.0, y: 53.2 },
    seat_3_right_upper: { x: 71.0, y: 37.9 },
    seat_4_top_right: { x: 49.3, y: 26.7 },
    seat_6_left_upper: { x: 25.3, y: 37.9 },
    seat_7_left_mid: { x: 25.3, y: 53.2 },
    seat_8_bottom_left: { x: 35.3, y: 65.8 },
  },
  "9-max": {
    seat_0_hero: { x: 49.3, y: 64.4 },
    seat_1_bottom_right: { x: 64.4, y: 65.8 },
    seat_2_right_mid: { x: 71.0, y: 53.2 },
    seat_3_right_upper: { x: 71.0, y: 37.9 },
    seat_4_top_right: { x: 58.6, y: 26.7 },
    seat_5_top_left: { x: 38.2, y: 26.7 },
    seat_6_left_upper: { x: 25.3, y: 37.9 },
    seat_7_left_mid: { x: 25.3, y: 53.2 },
    seat_8_bottom_left: { x: 35.3, y: 65.8 },
  },
};

export function getBetChipPosition(tableFormat, seatPosition) {
  const configuredPosition = betChipLayouts[tableFormat]?.[seatPosition.id];

  if (configuredPosition) {
    return configuredPosition;
  }

  return {
    x: seatPosition.x + (fallbackTableCenter.x - seatPosition.x) * 0.42,
    y: seatPosition.y + (fallbackTableCenter.y - seatPosition.y) * 0.42,
  };
}
