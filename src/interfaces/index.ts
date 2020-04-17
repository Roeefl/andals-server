export interface RoomOptions {
  roomTitle?: string
  maxPlayers?: number
  playVsBots?: boolean
  autoPickup?: boolean
  friendlyGameLog?: boolean
  enableBotReplacement?: boolean
};

export interface Loot {
  [key: string]: number
};

export interface AvailableLoot {
  [key: string]: Loot
};

export interface GameManifest {
  purchaseTypes: string[]
  boardLayout: string[]
  boardValues: number[]
  boardHarbors: string[]
  harborIndices: number[]
};
