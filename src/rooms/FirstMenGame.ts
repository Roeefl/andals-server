import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import BoardManager from '../game/BoardManager';
import PurchaseManager from '../game/PurchaseManager';
import BankManager from '../game/BankManager';
import TurnManager from '../game/TurnManager';
import GameCardManager from '../game/GameCardManager';
import TradeManager from '../game/TradeManager';
import DiceManager from '../game/DiceManager';

import {
  firstmenManifest
} from '../manifest';
import WildlingManager from '../game/WildlingManager';
import FirstMenGameState from '../north/FirstMenGameState';

class FirstMenGame extends BaseGame {
  onCreate(roomOptions: RoomOptions) {
    console.info("FirstMenGame | onCreate | roomOptions: ", roomOptions);

    const board = BoardManager.firstMenBoard();
    const gameCards = GameCardManager.shuffled();

    const tokens = WildlingManager.initialTokens();
    
    const gameState = new FirstMenGameState(firstmenManifest, board, gameCards, roomOptions);
    this.setState(gameState);
    
    this.populateWithBotsIfNeeded(roomOptions);
  };
};

export default FirstMenGame;
