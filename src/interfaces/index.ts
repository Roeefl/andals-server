import ClanArea from '../schemas/ClanArea';

export interface RoomOptions {
  roomTitle?: string
  maxPlayers?: number
  playVsBots?: boolean
  autoPickup?: boolean
  friendlyGameLog?: boolean
  enableBotReplacement?: boolean
};

export interface BuildingCost {
  [key: string]: number
};

export interface BuildingCosts {
  [key: string]: BuildingCost
};

export interface Loot {
  [key: string]: number
};

export interface AvailableLoot {
  [key: string]: Loot
};

export interface GameManifest {
  roomType: string
  purchaseTypes: string[]
  tilemap: number[][]
  structureTilemap: number[][]
  roadTilemap: number[][]
  boardLayout: string[]
  boardValues: number[]
  boardHarbors: string[]
  harborIndices: number[]
  bankTradeRate: number
};

export interface ClanManifest {
  name: string
  trails: number[][]
  clearings: number[]
};

export interface ClansManifest {
  [key: string]: ClanManifest
};

export interface WildlingClearing {
  trails: number[]
  clans: string[]
};
export interface ClanAreaManifest {
  [key: string]: ClanArea
};

export interface WildlingCounts {
  [key: string]: number
};

export interface TokensPerPurchase {
  [key: string]: number
};

export interface ResourceToSteal {
  stealFrom: string,
  resource: string
};
