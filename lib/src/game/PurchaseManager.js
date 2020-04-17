"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
const TileManager_1 = __importDefault(require("./TileManager"));
const Structure_1 = __importDefault(require("../schemas/Structure"));
const Road_1 = __importDefault(require("../schemas/Road"));
const manifest_1 = require("../manifest");
class PurchaseManager {
    onPurchaseStructure(state, data, ownerId, structureType = manifest_1.PURCHASE_SETTLEMENT) {
        const { row, col } = data;
        const structure = new Structure_1.default(ownerId, structureType, row, col);
        const updatedStructures = [
            ...state.structures,
            structure
        ];
        state.structures = new schema_1.ArraySchema(...updatedStructures);
        const owner = state.players[ownerId];
        owner.onPurchase(structureType, state.isSetupPhase);
        owner.saveLastStructure(structure);
        // Player just purchased a new settlement - check if need to add harbor privileges for him
        if (structureType === manifest_1.PURCHASE_SETTLEMENT) {
            state.board
                .filter(({ type, resource }) => type === manifest_1.TILE_WATER && !!resource)
                .forEach(({ resource, row: tileRow, col: tileCol }) => {
                const adjacentStructures = TileManager_1.default.harborAdjacentStructures(state.ports, tileRow, tileCol);
                if (adjacentStructures.some(([sRow, sCol]) => sRow === row && sCol === col)) {
                    owner.receiveHarborPrivileges(resource);
                }
            });
        }
    }
    onPurchaseRoad(state, data, ownerId) {
        const { row, col } = data;
        const road = new Road_1.default(ownerId, row, col);
        const updatedRoads = [
            ...state.roads,
            road
        ];
        state.roads = new schema_1.ArraySchema(...updatedRoads);
        const owner = state.players[ownerId];
        owner.onPurchase(manifest_1.PURCHASE_ROAD, state.isSetupPhase);
        // this.evaluateLongestRoad();
    }
    evaluateLongestRoad() {
        // @TODO: implement
    }
    onPurchaseGameCard(state, ownerId) {
        const randomCardIndex = Math.floor(Math.random() * state.gameCards.length);
        const selectedCard = state.gameCards[randomCardIndex];
        const owner = state.players[ownerId];
        owner.onPurchaseCard(selectedCard);
        const updatedGameCards = [
            ...state.gameCards
        ].filter((card, index) => index !== randomCardIndex);
        state.gameCards = new schema_1.ArraySchema(...updatedGameCards);
    }
    onPurchaseGuard(state, ownerId) {
    }
}
exports.default = new PurchaseManager();
