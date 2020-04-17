"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
const DiceRoll_1 = __importDefault(require("../schemas/DiceRoll"));
const BankManager_1 = __importDefault(require("../game/BankManager"));
class DiceManager {
    onDiceRoll(state, dice, currentPlayer) {
        state.dice = new schema_1.ArraySchema(...dice);
        state.isDiceRolled = true;
        const roll = new DiceRoll_1.default(dice);
        const updatedRolls = [
            ...currentPlayer.rolls,
            roll
        ];
        currentPlayer.rolls = new schema_1.ArraySchema(...updatedRolls);
        if (!state.isGameStarted)
            return;
        // If a player has more than seven cards, that player must discard half of them.    
        if (roll.value === 7) {
            Object
                .keys(state.players)
                .forEach(sessionId => {
                const player = state.players[sessionId];
                const totalResources = player.totalResourceCounts;
                if (totalResources > 7) {
                    player.mustDiscardHalfDeck = true;
                }
            });
            currentPlayer.mustMoveRobber = true;
            return;
        }
        BankManager_1.default.setResourcesLoot(state, roll.value);
    }
}
exports.default = new DiceManager();
