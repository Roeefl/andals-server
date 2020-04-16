import { shuffle } from 'lodash';

import GameCard from '../schemas/GameCard';
import Player from '../schemas/Player';

import {
  boardGameCards, gameCardTypes,
  CARD_KNIGHT, CARD_ROAD_BUILDING, CARD_YEAR_OF_PLENTY, CARD_MONOPOLY
} from '../manifest';

class GameCardManager {
  shuffled() {
    const shuffledCards: string[] = shuffle(boardGameCards);
    
    return shuffledCards
      .map(card => new GameCard(card))
  }

  playGameCard(player: Player, cardType: String, cardIndex: number) {
    player.hasPlayedGameCard = true;

    const card: GameCard = player.gameCards[cardIndex];
    card.wasPlayed = true;
    
    switch (cardType) {
      case CARD_KNIGHT:
        player.mustMoveRobber = true;
        break;

      case CARD_ROAD_BUILDING:
        player.roads = player.roads + 2;
        player.roadBuildingPhase = 1;
        break;

      case CARD_YEAR_OF_PLENTY:
        // @TODO: Implement via bank trading
        break;

      case CARD_MONOPOLY:
        player.isDeclaringMonopoly = true;
        break;

      default:
        console.error('GameCardManager -> playGameCard -> bad cardType: ', cardType);
        break;
    }
  }
}

export default new GameCardManager();
