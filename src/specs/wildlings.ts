import { ClansManifest, WildlingCounts, TokensPerPurchase, WildlingClearing } from '../interfaces';

export const clanNames = ['river', 'cave', 'hornfoot'];
export const [CLAN_RIVER, CLAN_CAVE, CLAN_HORNFOOT] = clanNames;

export const clansManifest: ClansManifest = {
  river: {
    name: CLAN_RIVER,
    trails: [[1, 2], [3]],
    clearings: [0, 1]
  },
  cave: {
    name: CLAN_CAVE,
    trails: [[4], [5]],
    clearings: [1, 2]
  },
  hornfoot: {
    name: CLAN_HORNFOOT,
    trails: [[6], [7, 8]],
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

export const wildlingTypes = ['regular', 'climber',' giant']
export const [WILDLING_REGULAR, WILDLING_CLIMBER, WILDLING_GIANT] = wildlingTypes;

export const totalTokens = 48;

export const tokensPerPurchase: TokensPerPurchase = {
  settlement: 1,
  city: 2,
  gameCard: 1
}

export const initialSpawnWildlingCounts: WildlingCounts = {
  regular: 24,
  climber: 8,
  giant: 8
};

export const initialClearingWildlingCounts: WildlingCounts = {
  regular: 0,
  climber: 0,
  giant: 0
};
