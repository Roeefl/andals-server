import { Loot, GameManifest } from '../interfaces';
import { ROOM_TYPE_BASE_GAME, ROOM_TYPE_FIRST_MEN } from '../roomTypes';

import baseGameHexTileMap from '../tilemaps/baseGame/hexes';
import baseGameStructureTileMap from '../tilemaps/baseGame/structures';
import baseGameRoadTileMap from '../tilemaps/baseGame/roads';

import firstMenHexTileMap from '../tilemaps/firstMen/hexes';
import firstMenStructureTileMap from '../tilemaps/firstMen/structures';
import firstMenRoadTileMap from '../tilemaps/firstMen/roads';

export const resourceTypes: string[] = ['lumber', 'brick', 'sheep', 'wheat', 'ore', 'desert', 'water', 'harborGeneric'];
export const [LUMBER, BRICK, SHEEP, WHEAT, ORE, DESERT, WATER, HARBOR_GENERIC] = resourceTypes;

export const gameCardTypes: string[] = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];
export const [CARD_KNIGHT, CARD_VICTORY_POINT, CARD_ROAD_BUILDING, CARD_YEAR_OF_PLENTY, CARD_MONOPOLY] = gameCardTypes;

export const resourceCardTypes = [LUMBER, BRICK, SHEEP, WHEAT, ORE];
export const harborTypes = [LUMBER, BRICK, SHEEP, WHEAT, ORE, HARBOR_GENERIC];

export const purchaseTypes: string[] = ['road', 'settlement', 'city', 'gameCard', 'guard'];
export const [PURCHASE_ROAD, PURCHASE_SETTLEMENT, PURCHASE_CITY, PURCHASE_GAME_CARD, PURCHASE_GUARD] = purchaseTypes;

const tileTypes  = ['spacer', 'resource', 'water'];
export const [
  TILE_SPACER,
  TILE_RESOURCE,
  TILE_WATER
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

// ======================= BaseGame Manifest =================================
// 19 terrain hexes (4 lumber, 4 sheep, 4 wheat, 3 brick, 3 ore, and 1 desert)
const baseGameBoardLayout: string[] = [
  ...new Array(4).fill(LUMBER),
  ...new Array(4).fill(SHEEP),
  ...new Array(4).fill(WHEAT),
  ...new Array(3).fill(BRICK),
  ...new Array(3).fill(ORE),
  DESERT
];

// 18 circular number tokens
const baseGameBoardValues: number[] = [
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

const baseGameHarbors: string[] = [
  ...new Array(4).fill(HARBOR_GENERIC),
  SHEEP,
  LUMBER,
  BRICK,
  WHEAT,
  ORE
];

const baseGameHarborIndices = [
  1, 3,
  12,
  14,
  27,
  28,
  40,
  43, 45
];
// ======================= /BaseGame Manifest =================================

// ======================= GoT Manifest =================================
const firstmenBoardLayout: string[] = [
  ...new Array(4).fill(LUMBER),
  ...new Array(4).fill(SHEEP),
  ...new Array(4).fill(WHEAT),
  ...new Array(4).fill(BRICK),
  ...new Array(5).fill(ORE)
];

const firstmenBoardValues: number[] = [
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

const firstmenHarbors: string[] = [
  SHEEP,
  LUMBER,
  BRICK,
  WHEAT,
  ORE
];

const firstmenHarborIndices = [28, 29, 30, 31, 32];
// ======================= /GoT Manifest =================================

export const baseGameManifest: GameManifest = {
  roomType: ROOM_TYPE_BASE_GAME,
  purchaseTypes: purchaseTypes.filter(type => type !== PURCHASE_GUARD),
  tilemap: baseGameHexTileMap,
  structureTilemap: baseGameStructureTileMap,
  roadTilemap: baseGameRoadTileMap,
  boardLayout: baseGameBoardLayout,
  boardValues: baseGameBoardValues,
  boardHarbors: baseGameHarbors,
  harborIndices: baseGameHarborIndices
};

export const firstmenManifest: GameManifest = {
  roomType: ROOM_TYPE_FIRST_MEN,
  purchaseTypes,
  tilemap: firstMenHexTileMap,
  structureTilemap: firstMenStructureTileMap,
  roadTilemap: firstMenRoadTileMap,
  boardLayout: firstmenBoardLayout,
  boardValues: firstmenBoardValues,
  boardHarbors: firstmenHarbors,
  harborIndices: firstmenHarborIndices
};
