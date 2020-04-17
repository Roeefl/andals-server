"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceTypes = ['lumber', 'brick', 'sheep', 'wheat', 'ore', 'desert', 'water', 'harborGeneric'];
exports.LUMBER = exports.resourceTypes[0], exports.BRICK = exports.resourceTypes[1], exports.SHEEP = exports.resourceTypes[2], exports.WHEAT = exports.resourceTypes[3], exports.ORE = exports.resourceTypes[4], exports.DESERT = exports.resourceTypes[5], exports.WATER = exports.resourceTypes[6], exports.HARBOR_GENERIC = exports.resourceTypes[7];
exports.gameCardTypes = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];
exports.CARD_KNIGHT = exports.gameCardTypes[0], exports.CARD_VICTORY_POINT = exports.gameCardTypes[1], exports.CARD_ROAD_BUILDING = exports.gameCardTypes[2], exports.CARD_YEAR_OF_PLENTY = exports.gameCardTypes[3], exports.CARD_MONOPOLY = exports.gameCardTypes[4];
exports.resourceCardTypes = [exports.LUMBER, exports.BRICK, exports.SHEEP, exports.WHEAT, exports.ORE];
exports.harborTypes = [exports.LUMBER, exports.BRICK, exports.SHEEP, exports.WHEAT, exports.ORE, exports.HARBOR_GENERIC];
exports.purchaseTypes = ['road', 'settlement', 'city', 'gameCard', 'guard'];
exports.PURCHASE_ROAD = exports.purchaseTypes[0], exports.PURCHASE_SETTLEMENT = exports.purchaseTypes[1], exports.PURCHASE_CITY = exports.purchaseTypes[2], exports.PURCHASE_GAME_CARD = exports.purchaseTypes[3], exports.PURCHASE_GUARD = exports.purchaseTypes[4];
const tileTypes = ['resource', 'water', 'spacer'];
exports.TILE_RESOURCE = tileTypes[0], exports.TILE_WATER = tileTypes[1], exports.TILE_SPACER = tileTypes[2];
// 25 Development Cards:
// 14 Knight/Soldier Cards
// 5 Victory Point Cards
// 6 Progress Cards (2 each)
exports.boardGameCards = [
    ...new Array(14).fill(exports.CARD_KNIGHT),
    ...new Array(5).fill(exports.CARD_VICTORY_POINT),
    ...new Array(2).fill(exports.CARD_ROAD_BUILDING),
    ...new Array(2).fill(exports.CARD_YEAR_OF_PLENTY),
    ...new Array(2).fill(exports.CARD_MONOPOLY)
];
exports.playerColors = ['#5E35B1', '#FF1744', '#FB8C00', '#388E3C', '#039BE5'];
exports.initialResourceCounts = {
    lumber: 0,
    sheep: 0,
    brick: 0,
    wheat: 0,
    ore: 0
};
// ======================= BaseGame Manifest =================================
// 19 terrain hexes (4 lumber, 4 sheep, 4 wheat, 3 brick, 3 ore, and 1 desert)
const baseGameBoardLayout = [
    ...new Array(4).fill(exports.LUMBER),
    ...new Array(4).fill(exports.SHEEP),
    ...new Array(4).fill(exports.WHEAT),
    ...new Array(3).fill(exports.BRICK),
    ...new Array(3).fill(exports.ORE),
    exports.DESERT
];
// 18 circular number tokens
const baseGameBoardValues = [
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
const baseGameHarbors = [
    ...new Array(4).fill(exports.HARBOR_GENERIC),
    exports.SHEEP,
    exports.LUMBER,
    exports.BRICK,
    exports.WHEAT,
    exports.ORE
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
const firstmenBoardLayout = [
    ...new Array(4).fill(exports.LUMBER),
    ...new Array(4).fill(exports.SHEEP),
    ...new Array(4).fill(exports.WHEAT),
    ...new Array(4).fill(exports.BRICK),
    ...new Array(5).fill(exports.ORE)
];
const firstmenBoardValues = [
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
const firstmenHarbors = [
    exports.SHEEP,
    exports.LUMBER,
    exports.BRICK,
    exports.WHEAT,
    exports.ORE
];
const firstmenHarborIndices = [
    1, 3,
    12,
    14,
    27,
    28,
    40,
    43, 45
];
// ======================= /GoT Manifest =================================
exports.baseGameManifest = {
    purchaseTypes: exports.purchaseTypes.filter(type => type !== exports.PURCHASE_GUARD),
    boardLayout: baseGameBoardLayout,
    boardValues: baseGameBoardValues,
    boardHarbors: baseGameHarbors,
    harborIndices: baseGameHarborIndices
};
exports.firstmenManifest = {
    purchaseTypes: exports.purchaseTypes,
    boardLayout: firstmenBoardLayout,
    boardValues: firstmenBoardValues,
    boardHarbors: firstmenHarbors,
    harborIndices: firstmenHarborIndices
};
