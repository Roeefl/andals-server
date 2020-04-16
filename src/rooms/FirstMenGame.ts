import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import GameState from '../game/GameState';
import BoardManager from '../game/BoardManager';
import PurchaseManager from '../game/PurchaseManager';
import BankManager from '../game/BankManager';
import TurnManager from '../game/TurnManager';
import GameCardManager from '../game/GameCardManager';
import TradeManager from '../game/TradeManager';
import DiceManager from '../game/DiceManager';

class FirstMenGame extends BaseGame {
  onCreate(roomOptions: RoomOptions) {
    console.info("FirstMenGame | onCreate | roomOptions: ", roomOptions);

    const board = BoardManager.firstMenBoard();
    const gameCards = GameCardManager.shuffled();
    
    const gameState = new GameState(board, gameCards, roomOptions);
    this.setState(gameState);
    
    this.populateWithBotsIfNeeded(roomOptions);
  };
};

export default FirstMenGame;
