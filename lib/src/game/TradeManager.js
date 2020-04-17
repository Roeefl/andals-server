"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
const manifest_1 = require("../manifest");
const constants_1 = require("../constants");
class TradeManager {
    onStartEndTrade(state, type, currentPlayer, withWho, isAgreed) {
        if (type === constants_1.MESSAGE_TRADE_START_AGREED) {
            const { pendingTrade } = currentPlayer;
            const otherPlayer = state.players[pendingTrade];
            currentPlayer.resetTradeStatus();
            otherPlayer.resetTradeStatus();
            if (!isAgreed)
                return;
            currentPlayer.tradingWith = otherPlayer.playerSessionId;
            otherPlayer.tradingWith = currentPlayer.playerSessionId;
            return;
        }
        if (type === constants_1.MESSAGE_TRADE_REQUEST) {
            if (!withWho)
                return;
            const otherPlayer = state.players[withWho];
            currentPlayer.isWaitingTradeRequest = true;
            otherPlayer.pendingTrade = currentPlayer.playerSessionId;
            return;
        }
        const { tradingWith } = currentPlayer;
        if (!tradingWith)
            return;
        const otherPlayer = state.players[tradingWith];
        if (type === constants_1.MESSAGE_TRADE_REFUSE) {
            currentPlayer.cancelTrade();
            otherPlayer.cancelTrade();
            return;
        }
        if (type === constants_1.MESSAGE_TRADE_CONFIRM) {
            currentPlayer.isTradeConfirmed = !currentPlayer.isTradeConfirmed;
            if (otherPlayer.isTradeConfirmed) {
                this.onExecuteTrade(currentPlayer, otherPlayer);
            }
        }
    }
    onUpdateTrade(state, player, resource, isRemoveCard) {
        player.updateTradeCounts(resource, isRemoveCard);
        player.isTradeConfirmed = false;
        const { tradingWith } = player;
        if (tradingWith) {
            const otherPlayer = state.players[tradingWith];
            otherPlayer.isTradeConfirmed = false;
        }
    }
    onExecuteTrade(player1, player2) {
        player1.performTrade(player2.tradeCounts);
        player2.performTrade(player1.tradeCounts);
        player1.resetTradeCounts();
        player2.resetTradeCounts();
        player1.tradingWith = null;
        player2.tradingWith = null;
    }
    onStealCard(state, currentPlayer, stealFrom, resource) {
        const otherPlayer = state.players[stealFrom];
        currentPlayer.addResource(resource);
        otherPlayer.stolenResource(resource);
        currentPlayer.allowStealingFrom = new schema_1.ArraySchema();
    }
    onMonopoly(state, monopolyPlayer, resource) {
        // Every player must then give that player all of that type of resource cards in their hand
        Object
            .keys(state.players)
            .filter(sessionId => sessionId !== monopolyPlayer.playerSessionId)
            .forEach(sessionId => {
            const otherPlayer = state.players[sessionId];
            const otherPlayerIsGiving = new schema_1.MapSchema(Object.assign(Object.assign({}, manifest_1.initialResourceCounts), { [resource]: otherPlayer.resourceCounts[resource] }));
            monopolyPlayer.performTrade(otherPlayerIsGiving);
            otherPlayer.gaveAllOfResourceType(resource);
        });
    }
    onBankTrade(currentPlayer, requestedResource) {
        const playerIsReceiving = new schema_1.MapSchema(Object.assign(Object.assign({}, manifest_1.initialResourceCounts), { [requestedResource]: 1 }));
        currentPlayer.performTrade(playerIsReceiving);
        currentPlayer.resetTradeCounts();
    }
}
exports.default = new TradeManager();
