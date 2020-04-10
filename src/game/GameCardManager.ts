import GameCard from '../schemas/GameCard';
import Player from '../schemas/Player';

import {
  availableInitialGameCards, gameCardTypes,
  CARD_KNIGHT, CARD_ROAD_BUILDING, CARD_YEAR_OF_PLENTY, CARD_MONOPOLY
} from '../manifest';

class GameCardManager {
  initialGameCards() {
    const cards = [];
  
    let availableGameCards: string[] = [
      ...availableInitialGameCards
    ];
  
    for (let c = 0; c < availableInitialGameCards.length; c++) {
      const randomCardIndex = Math.floor(Math.random() * availableGameCards.length);
      const randomCardType = availableGameCards[randomCardIndex];
  
      const card = new GameCard(randomCardType);
  
      cards.push(card);
  
      availableGameCards.splice(randomCardIndex, 1);
    }
  
    return cards;
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
