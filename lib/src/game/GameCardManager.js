"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const GameCard_1 = __importDefault(require("../schemas/GameCard"));
const manifest_1 = require("../manifest");
class GameCardManager {
    shuffled() {
        const shuffledCards = lodash_1.shuffle(manifest_1.boardGameCards);
        return shuffledCards
            .map(card => new GameCard_1.default(card));
    }
    playGameCard(player, cardType, cardIndex) {
        player.hasPlayedGameCard = true;
        const card = player.gameCards[cardIndex];
        card.wasPlayed = true;
        switch (cardType) {
            case manifest_1.CARD_KNIGHT:
                player.mustMoveRobber = true;
                break;
            case manifest_1.CARD_ROAD_BUILDING:
                player.roads = player.roads + 2;
                player.roadBuildingPhase = 1;
                break;
            case manifest_1.CARD_YEAR_OF_PLENTY:
                // @TODO: Implement via bank trading
                break;
            case manifest_1.CARD_MONOPOLY:
                player.isDeclaringMonopoly = true;
                break;
            default:
                console.error('GameCardManager -> playGameCard -> bad cardType: ', cardType);
                break;
        }
    }
}
exports.default = new GameCardManager();
