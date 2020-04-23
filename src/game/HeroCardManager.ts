import { ArraySchema } from '@colyseus/schema';
import { shuffle } from 'lodash';

import HeroCard, {
  heroCardTypes,
  HERO_CARD_JeorMormont,
  HERO_CARD_BowenMarsh,
  HERO_CARD_SamwellTarly,
  HERO_CARD_OthellYarwyck,
  HERO_CARD_AlliserThorne,
  HERO_CARD_Melisandre,
  HERO_CARD_ManceRayder,
  HERO_CARD_BenjenStark,
  HERO_CARD_Ygritte,
  HERO_CARD_Yoren,
  HERO_CARD_QhorinHalfhand
} from '../schemas/HeroCard';

import Player from '../schemas/Player';
import FirstMenGameState from '../north/FirstMenGameState';

class HeroCardManager {
  shuffle() {
    const initialHeroCards = HeroCard.implemented();
    
    const shuffledCards: string[] = shuffle(initialHeroCards);
    return shuffledCards.map(type => new HeroCard(type))
  }

  assignInitialHeroCards(state: FirstMenGameState) {
    Object
      .keys(state.players)
      .forEach(sessionId => this.assignInitialHeroCard(state, sessionId));
  }

  assignInitialHeroCard(state: FirstMenGameState, clientSessionId: string) {
    const player: Player = state.players[clientSessionId];
    const [heroCard] = state.heroCards;

    player.currentHeroCard = heroCard;
    heroCard.ownerId = player.playerSessionId;

    const updatedCards = state.heroCards.slice(1);
    state.heroCards = new ArraySchema<HeroCard>(
      ...updatedCards
    );
  }

  playHeroCard(state: FirstMenGameState, player: Player, type: string) {
    if (player.hasPlayedHeroCard) {
      // player.mustSwapHeroCard();
    }

    player.hasPlayedHeroCard = true;
    player.currentHeroCard.wasPlayed = true;
    player.heroPrivilege = type;

    switch (type) {
      case HERO_CARD_BowenMarsh:
        player.bankTradeRate = 1;
        break;

      case HERO_CARD_QhorinHalfhand:
        player.mustMoveRobber = true;
        break;
      
      case HERO_CARD_ManceRayder:
        player.allowStealingFrom = new ArraySchema<string>(
          ...this.higherVpOpponents(state, player)
        );
        player.isVisibleSteal = true;
        break;

      case HERO_CARD_AlliserThorne:
        // When you build a guard, substitute 1 of the 3 resources with any 1 other resource of your choice
        break;

      case HERO_CARD_Ygritte:
        break;

      default:
        break;
    }
  }

  higherVpOpponents(state: FirstMenGameState, currentPlayer: Player) {
    return Object
      .values(state.players)
      .filter(player => player.victoryPoints > currentPlayer.victoryPoints);
  }
}

export default new HeroCardManager();
