import { ClanManifest, ClansManifest, WildlingCounts } from '../interfaces';

export const clanNames = ['river', 'cave', 'hornfoot'];
export const [CLAN_RIVER, CLAN_CAVE, CLAN_HORNFOOT] = clanNames;

export const clans: ClansManifest = {
  river: {
    name: CLAN_RIVER,
    trails: [[1, 2], [3]]
  },
  cave: {
    name: CLAN_CAVE,
    trails: [[4], [5]]
  },
  hornfoot: {
    name: CLAN_HORNFOOT,
    trails: [[6], [7, 8]]
  },
};

export const wildlingTypes = ['regular', 'climber',' giant']
export const [WILDLING_REGULAR, WILDLING_CLIMBER, WILDLING_GIANT] = wildlingTypes;

export const totalTokens = 48;

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
