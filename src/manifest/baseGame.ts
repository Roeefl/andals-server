import { LUMBER, SHEEP, WHEAT, BRICK, ORE, DESERT, HARBOR_GENERIC } from '../manifest';

// 19 terrain hexes (4 lumber, 4 sheep, 4 wheat, 3 brick, 3 ore, and 1 desert)
export const baseGameBoardLayout: string[] = [
  ...new Array(4).fill(LUMBER),
  ...new Array(4).fill(SHEEP),
  ...new Array(4).fill(WHEAT),
  ...new Array(3).fill(BRICK),
  ...new Array(3).fill(ORE),
  DESERT
];

// 18 circular number tokens
export const baseGameBoardValues: number[] = [
  2,
  3, 3,
  4, 4,
  5, 5,
  6, 6,
  8, 8,
  9, 9,
  10, 10,
  11, 11,
  12
];

export const baseGameHarbors: string[] = [
  ...new Array(4).fill(HARBOR_GENERIC),
  SHEEP,
  LUMBER,
  BRICK,
  WHEAT,
  ORE
];

export const baseGameHarborIndices = [
  1, 3,
  12,
  14,
  27,
  28,
  40,
  43, 45
];
