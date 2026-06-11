// lane-system.js — Lane constants & lane-switch logic
export const LANE_WIDTH = 3.2;
export const LANES = [-1, 0, 1];
export const LANE_POSITIONS = {
  '-1': -LANE_WIDTH,
  '0': 0,
  '1': LANE_WIDTH,
};

export function getLaneX(lane) {
  return lane * LANE_WIDTH;
}
