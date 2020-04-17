"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseGame_1 = __importDefault(require("./BaseGame"));
const GameState_1 = __importDefault(require("../game/GameState"));
const BoardManager_1 = __importDefault(require("../game/BoardManager"));
const GameCardManager_1 = __importDefault(require("../game/GameCardManager"));
const manifest_1 = require("../manifest");
class FirstMenGame extends BaseGame_1.default {
    onCreate(roomOptions) {
        console.info("FirstMenGame | onCreate | roomOptions: ", roomOptions);
        const board = BoardManager_1.default.firstMenBoard();
        const gameCards = GameCardManager_1.default.shuffled();
        const gameState = new GameState_1.default(manifest_1.firstmenManifest, board, gameCards, roomOptions);
        this.setState(gameState);
        this.populateWithBotsIfNeeded(roomOptions);
    }
    ;
}
;
exports.default = FirstMenGame;
