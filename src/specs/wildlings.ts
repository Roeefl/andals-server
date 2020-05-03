import { ClansManifest, WildlingCounts, TokensPerPurchase, WildlingClearing } from '../interfaces';

export const clanNames = ['river', 'cave', 'hornfoot'];
export const [CLAN_RIVER, CLAN_CAVE, CLAN_HORNFOOT] = clanNames;

const passages: number[][] = [
  [1, 2],
  [3],
  [4],
  [5],
  [6],
  [7, 8]
];

// Trails 1 through 8
export const trailRoutes = [
  [],
  [2, 10, 17, 25],
  [2, 11, 19, 28],
  [3, 11, 18, 26],
  [3, 12, 20, 29],
  [4, 12, 19, 27],
  [4, 13, 21, 30],
  [5, 13, 20, 28],
  [5, 14, 22, 30]
];

export const clansManifest: ClansManifest = {
  river: {
    name: CLAN_RIVER,
    trails: [passages[0], passages[1]],
    clearings: [0, 1]
  },
  cave: {
    name: CLAN_CAVE,
    trails: [passages[2], passages[3]],
    clearings: [1, 2]
  },
  hornfoot: {
    name: CLAN_HORNFOOT,
    trails: [passages[4], passages[5]],
    clearings: [2, 3]
  },
};

export const clearings: WildlingClearing[] = [
  {
    trails: [1, 2],
    clans: [CLAN_RIVER]
  },
  {
    trails: [3, 4],
    clans: [CLAN_RIVER, CLAN_CAVE]
  },
  {
    trails: [5, 6],
    clans: [CLAN_CAVE, CLAN_HORNFOOT]
  },
  {
    trails: [7, 8],
    clans: [CLAN_HORNFOOT]
  }
];

export const wildlingTypes = ['regular', 'climber', 'giant', 'whiteWalker']
export const [WILDLING_REGULAR, WILDLING_CLIMBER, WILDLING_GIANT, WILDLING_WHITE_WALKER] = wildlingTypes;

export const totalTokens = 48;

export const tokensPerPurchase: TokensPerPurchase = {
  settlement: 1,
  city: 2,
  gameCard: 1
};

export const initialSpawnWildlingCounts: WildlingCounts = {
  regular: 22,
  climber: 8,
  giant: 8,
  // whiteWalker: 0
};

export const initialClearingWildlingCounts: WildlingCounts = {
  regular: 0,
  climber: 0,
  giant: 0,
  // whiteWalker: 0
};
