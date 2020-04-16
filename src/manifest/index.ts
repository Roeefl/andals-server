import { Loot } from '../interfaces';
import { baseGameBoardLayout, baseGameBoardValues, baseGameHarbors, baseGameHarborIndices } from './baseGame';
import { firstmenBoardLayout, firstmenBoardValues, firstmenHarbors, firstmenHarborIndices } from './firstMen';

export const resourceTypes: string[] = ['lumber', 'brick', 'sheep', 'wheat', 'ore', 'desert', 'water', 'harborGeneric'];
export const [LUMBER, BRICK, SHEEP, WHEAT, ORE, DESERT, WATER, HARBOR_GENERIC] = resourceTypes;

export const gameCardTypes: string[] = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];
export const [CARD_KNIGHT, CARD_VICTORY_POINT, CARD_ROAD_BUILDING, CARD_YEAR_OF_PLENTY, CARD_MONOPOLY] = gameCardTypes;

export const resourceCardTypes = [LUMBER, BRICK, SHEEP, WHEAT, ORE];
export const harborTypes = [LUMBER, BRICK, SHEEP, WHEAT, ORE, HARBOR_GENERIC];

export const purchaseTypes: string[] = ['road', 'settlement', 'city', 'gameCard', 'guard'];
export const [PURCHASE_ROAD, PURCHASE_SETTLEMENT, PURCHASE_CITY, PURCHASE_GAME_CARD, PURCHASE_GUARD] = purchaseTypes;

const tileTypes  = ['resource', 'water', 'spacer'];
export const [
  TILE_RESOURCE,
  TILE_WATER,
  TILE_SPACER
] = tileTypes;

// 25 Development Cards:
// 14 Knight/Soldier Cards
// 5 Victory Point Cards
// 6 Progress Cards (2 each)
export const boardGameCards: string[] = [
  ...new Array(14).fill(CARD_KNIGHT),
  ...new Array(5).fill(CARD_VICTORY_POINT),
  ...new Array(2).fill(CARD_ROAD_BUILDING),
  ...new Array(2).fill(CARD_YEAR_OF_PLENTY),
  ...new Array(2).fill(CARD_MONOPOLY)
];

export const playerColors = ['#5E35B1', '#FF1744', '#FB8C00', '#388E3C', '#039BE5'];

export const initialResourceCounts: Loot = {
  lumber: 0,
  sheep: 0,
  brick: 0,
  wheat: 0,
  ore: 0
};

interface GameManifest {
  purchaseTypes: string[]
  boardLayout: string[]
  boardValues: number[]
  boardHarbors: string[]
  harborIndices: number[]
};

export const baseGameManifest: GameManifest = {
  purchaseTypes: purchaseTypes.filter(type => type !== PURCHASE_GUARD),
  boardLayout: baseGameBoardLayout,
  boardValues: baseGameBoardValues,
  boardHarbors: baseGameHarbors,
  harborIndices: baseGameHarborIndices
};

export const firstmenManifest: GameManifest = {
  purchaseTypes,
  boardLayout: firstmenBoardLayout,
  boardValues: firstmenBoardValues,
  boardHarbors: firstmenHarbors,
  harborIndices: firstmenHarborIndices
};
