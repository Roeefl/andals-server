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
import { PURCHASE_GUARD } from '../manifest';

class HeroCardManager {
  shuffle() {
    const initialHeroCards = HeroCard.implemented();
    
    const shuffledCards: string[] = shuffle(initialHeroCards);
    return shuffledCards.map(type => new HeroCard(type))
  }

  assignInitialHeroCards(state: FirstMenGameState) {
    Object
      .values(state.players)
      .filter(player => player.isBot)
      .forEach(bot => this.assignInitialHeroCard(state, bot.playerSessionId));
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

  playHeroCard(state: FirstMenGameState, currentPlayer: Player, type: string, isDiscard: boolean = false) {
    console.log("HeroCardManager -> playHeroCard -> type", type)
    const swapAfterPlay: boolean = isDiscard || currentPlayer.hasPlayedHeroCard;

    // @TODO: Only need 1 of those 2
    currentPlayer.hasPlayedHeroCard = true;
    currentPlayer.currentHeroCard.wasPlayed = true;

    currentPlayer.heroPrivilege = type;
    console.log("HeroCardManager -> playHeroCard -> heroPrivilege",currentPlayer.heroPrivilege)

    switch (type) {
      case HERO_CARD_BowenMarsh:
        currentPlayer.bankTradeRate = 1;
        break;

      case HERO_CARD_QhorinHalfhand:
        currentPlayer.mustMoveRobber = true;
        break;
      
      case HERO_CARD_ManceRayder:
        currentPlayer.allowStealingFrom = new ArraySchema<string>(
          ...this.higherVpOpponents(state, currentPlayer)
        );
        currentPlayer.isVisibleSteal = true;
        break;

      case HERO_CARD_AlliserThorne:
        // When you build a guard, substitute 1 of the 3 resources with any 1 other resource of your choice
        currentPlayer.flexiblePurchase = PURCHASE_GUARD;
        currentPlayer.allowFlexiblePurchase(PURCHASE_GUARD);
        break;

      case HERO_CARD_Ygritte:
        break;

      default:
        break;
    }

    if (swapAfterPlay)
      currentPlayer.swappingHeroCard = true;
  }

  swapPlayerHeroCard(state: FirstMenGameState, currentPlayer: Player, heroType?: string) {
    const desiredHeroCard = heroType
      ? state.heroCards.find(({ type }) => type === heroType)
      : state.heroCards[0];

    if (!!heroType && !desiredHeroCard)
      return this.swapPlayerHeroCard(state, currentPlayer);
    
    const swappedHeroCard = currentPlayer.currentHeroCard;
    swappedHeroCard.ownerId = null;
    swappedHeroCard.wasPlayed = false;

    currentPlayer.currentHeroCard = desiredHeroCard;
    desiredHeroCard.ownerId = currentPlayer.playerSessionId;
    desiredHeroCard.wasPlayed = false;

    const updatedHeroCards: HeroCard[] = [
      ...state.heroCards.filter(({ type }) => type !== desiredHeroCard.type),
      swappedHeroCard
    ];
    
    state.heroCards = new ArraySchema<HeroCard>(
      ...updatedHeroCards
    );

    // currentPlayer.hasPlayedHeroCard = false;
    currentPlayer.heroPrivilege = null;
  }

  higherVpOpponents(state: FirstMenGameState, currentPlayer: Player) {
    return Object
      .values(state.players)
      .filter(player => player.victoryPoints > currentPlayer.victoryPoints)
      .map(player => player.playerSessionId);
  }
}

export default new HeroCardManager();
