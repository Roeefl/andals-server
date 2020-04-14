const FCG = require('fantasy-content-generator');
const delay = require('delay');

import GameState from '../game/GameState';
import Player, { PlayerOptions } from './Player';
import TileManager, { ValidStructurePosition } from '../game/TileManager';
import { generateSessionId } from '../utils/sessionId';

import {
  PURCHASE_ROAD,
  PURCHASE_SETTLEMENT,
  PURCHASE_GAME_CARD
} from '../manifest';

class GameBot extends Player {
  constructor(color: string, playerIndex: number) {
    const sessionId = generateSessionId();
    
    const generatedBot = FCG.NPCs.generate(); 

    const options: PlayerOptions = {
      nickname: generatedBot.nameObject.name
    };

    super(sessionId, options, color, playerIndex);
    this.isBot = true;
  }

  static async rollDice() {
    await delay(500);

    const randomDice1 = Math.floor(Math.random() * 6) + 1;
    const randomDice2 = Math.floor(Math.random() * 6) + 1;

    return [
      randomDice1,
      randomDice2
    ];
  }

  static async placeSettlement(state: GameState, botSessionId: string) {
    await delay(1500);

    const validSettlements: ValidStructurePosition[] = TileManager.validSettlements(state, botSessionId);
    const randomIndex = Math.floor(Math.random() * validSettlements.length);
    const settlement: ValidStructurePosition = validSettlements[randomIndex];

    return {
      structureType: PURCHASE_SETTLEMENT,
      row: settlement.row,
      col: settlement.col
    };
  }

  static async placeRoad(state: GameState, currentBot: Player) {
    await delay(1500);

    const validRoads: ValidStructurePosition[] = TileManager.validRoads(state, currentBot);
    const randomIndex = Math.floor(Math.random() * validRoads.length);
    const road: ValidStructurePosition = validRoads[randomIndex];

    return {
      structureType: PURCHASE_ROAD,
      row: road.row,
      col: road.col
    };
  }

  discardHalfDeck() {

  }

  moveRobber() {

  }

  stealCard() {

  }

  purchaseCard() {

  }

  playCard() {

  }

  acceptTrade() {

  }

  adjustTrade() {
    
  }
};

export default GameBot;
