"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
const TileManager_1 = __importDefault(require("./TileManager"));
const manifest_1 = require("../manifest");
const buildingCosts_1 = __importDefault(require("../buildingCosts"));
class BankManager {
    setResourcesLoot(state, diceTotal) {
        const updatedResourceCounts = Object.assign({}, state.resourceCounts);
        const updatedLoot = Object
            .keys(state.players)
            .reduce((acc, ownerId) => {
            acc[ownerId] = Object.assign({}, manifest_1.initialResourceCounts);
            return acc;
        }, {});
        // Game started - round 1 or higher - allocate resources from the bank to players according to hexes state
        state.board
            .filter(({ type, resource }, index) => type === manifest_1.TILE_RESOURCE && !!resource && resource !== manifest_1.DESERT && index !== state.robberPosition)
            .filter(({ value }) => !diceTotal || value === diceTotal)
            // 18 Resource-type tiles left to loop over
            .forEach(({ resource, row: tileRow, col: tileCol }) => {
            const adjacentStructures = TileManager_1.default.hexTileAdjacentStructures(tileRow, tileCol);
            state.structures
                .forEach(({ row, col, ownerId, type }) => {
                if (adjacentStructures.some(([sRow, sCol]) => sRow === row && sCol === col)) {
                    const addedValue = type === manifest_1.PURCHASE_CITY ? 2 : 1;
                    updatedLoot[ownerId][resource] += addedValue;
                    updatedResourceCounts[resource] -= addedValue;
                }
            });
        });
        Object
            .keys(state.players)
            .forEach(sessionId => {
            const player = state.players[sessionId];
            const playerUpdatedLoot = updatedLoot[sessionId];
            player.availableLoot = new schema_1.MapSchema(Object.assign({}, playerUpdatedLoot));
        });
        state.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
    }
    onPlayerCollectAllLoot(player) {
        player.onCollectLoot();
    }
    returnToBank(state, discardedCounts) {
        const updatedResourceCounts = manifest_1.resourceCardTypes.reduce((acc, name) => {
            acc[name] = state.resourceCounts[name] + discardedCounts[name];
            return acc;
        }, {});
        state.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
    }
    onBankPayment(state, purchaseType) {
        if (!state.isGameStarted)
            return;
        const totalPayments = buildingCosts_1.default[purchaseType];
        this.returnToBank(state, totalPayments);
    }
}
exports.default = new BankManager();
