import { LUMBER, SHEEP, WHEAT, BRICK, ORE } from '../manifest';

export const firstmenBoardLayout: string[] = [
  ...new Array(4).fill(LUMBER),
  ...new Array(4).fill(SHEEP),
  ...new Array(4).fill(WHEAT),
  ...new Array(4).fill(BRICK),
  ...new Array(5).fill(ORE)
];

export const firstmenBoardValues: number[] = [
  2,
  3, 3,
  4, 4,
  5, 5, 5,
  6, 6, 6,
  8, 8, 8,
  9, 9,
  10, 10,
  11, 11,
  12
];

export const firstmenHarbors: string[] = [
  SHEEP,
  LUMBER,
  BRICK,
  WHEAT,
  ORE
];

export const firstmenHarborIndices = [
  1, 3,
  12,
  14,
  27,
  28,
  40,
  43, 45
];
