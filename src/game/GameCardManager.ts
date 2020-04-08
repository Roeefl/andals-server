import GameCard from '../schemas/GameCard';
import { availableInitialGameCards } from '../manifest';

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
}

export default new GameCardManager();
