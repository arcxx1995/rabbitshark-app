# Seat Layout Editing Guide

Edit nameplate positions in:

```text
src/config/seatLayouts.js
```

Each seat uses stage percentages:

```js
{ id: "seat_1_left_lower", x: 11.7, y: 36.8, anchor: "center", cardDock: "top" }
```

- `x`: horizontal position from left to right, `0` to `100`.
- `y`: vertical position from top to bottom, `0` to `100`.
- `anchor`: which part of the nameplate attaches to `x/y`.
- `cardDock`: where the cards tuck relative to the nameplate.

For your current setup, keep `anchor: "center"` unless you want edge anchoring.

Useful edits:

- Move left: decrease `x`.
- Move right: increase `x`.
- Move up: decrease `y`.
- Move down: increase `y`.
- Keep symmetry: if you move a left seat from `x: 11.7` to `x: 10`, move the matching right seat from `x: 88.3` to `x: 90`.
- Matching mirrored x values should add to `100`.

Examples:

```js
// Move Astra/Vector left on 6-max:
{ id: "seat_1_left_lower", x: 10.5, y: 36.8, anchor: "center", cardDock: "top" },
{ id: "seat_2_left_upper", x: 10.5, y: 60.2, anchor: "center", cardDock: "top" },

// Mirror right-side seats:
{ id: "seat_4_right_lower", x: 89.5, y: 36.8, anchor: "center", cardDock: "top" },
{ id: "seat_5_right_upper", x: 89.5, y: 60.2, anchor: "center", cardDock: "top" },
```
