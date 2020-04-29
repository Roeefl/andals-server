import { ArraySchema } from '@colyseus/schema';
import { shuffle } from 'lodash';

import FirstMenGameState from '../north/FirstMenGameState';
import Player from '../schemas/Player';
import GameCard from '../schemas/GameCard';

import HeroCard, {
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
  HERO_CARD_QhorinHalfhand,
  HERO_CARD_IlynPayne,
  HERO_CARD_EuronGrejoy,
  HERO_CARD_TywinLannister,
  HERO_CARD_Thoros,
  HERO_CARD_Stannis
} from '../schemas/HeroCard';

import { PURCHASE_GUARD, PURCHASE_GAME_CARD, CARD_KNIGHT } from '../manifest';

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
    console.log("HeroCardManager -> playHeroCard -> heroPrivilege", currentPlayer.heroPrivilege)

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

      case HERO_CARD_OthellYarwyck:
        currentPlayer.allowRemoveRoad = true;
        // Remove 1 of your roads from the board 
        // and rebuild it for free at a different legal location. 
        // The road you remove must only be connected on 1 of its 2 ends to your pieces. Ignore opponents’ pieces when checking connections.
        break;

      case HERO_CARD_IlynPayne:
        // You may immediately remove any Guard on the wall which belongs to another player, and return it to him
        currentPlayer.allowKill = PURCHASE_GUARD;
        break;

      case HERO_CARD_JeorMormont:
        // Demand 1 resource card each from all players.
        // The cards must be of the same resource type.
        // For each resource card you receive, give the respective player 1 resource card of your choice in return.

        currentPlayer.allowStealingFrom = new ArraySchema<string>(
          ...state.otherPlayersSessionIds(currentPlayer)
        );
        currentPlayer.isVisibleSteal = true;

        break;

      case HERO_CARD_SamwellTarly:
        // If, after resolving any production roll (not a “7”), you receive no resource cards, take any 1 resource card of your choice from the supply.
        break;

      case HERO_CARD_Melisandre:
        // Choose your development card from the 3 top cards of the deck, then reshuffle the deck
        currentPlayer.flexiblePurchase = PURCHASE_GAME_CARD;
        currentPlayer.allowFlexiblePurchase(PURCHASE_GAME_CARD);
        currentPlayer.isVisiblePurchaseGameCard = true;
        break;

      case HERO_CARD_BenjenStark:
        // Remove 1 wildling from a clearing or a camp, return it to the Frostfangs.
        // If you remove a wildling from a camp and there are more wildlings in the camps farther from the clearings than the wildling you removed,
        // move them each 1 camp closer to the clearings.
        // Then, reveal a wildling token from the pool and place it accordingly.

        break;

      case HERO_CARD_Yoren:
        const playedKnightCardIndex: number = currentPlayer.gameCards
          .findIndex(({ type, wasPlayed }) => type === CARD_KNIGHT && wasPlayed);

        if (playedKnightCardIndex < 0) break;

        // Discard 1 Knight gameCard that player has already played
        state.gameCards = new ArraySchema<GameCard>(
          ...state.gameCards,
          currentPlayer.gameCards[playedKnightCardIndex]
        );

        currentPlayer.onReturnGameCard(playedKnightCardIndex);
        
        currentPlayer.allowFreeGuard = true;
        break;

      case HERO_CARD_EuronGrejoy:
        currentPlayer.bankTradeRate = 2;
        break;

      case HERO_CARD_TywinLannister:
        // Trade any of your resource cards with the supply for one sheep resource card
        break;

      case HERO_CARD_Thoros:
        // Instantly revive him and place him back at any wall section
        break;

      case HERO_CARD_Stannis:
        currentPlayer.allowGuardRelocate = true;
        break;
        // You may immediately move one of your guards to any wall section

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
  }

  higherVpOpponents(state: FirstMenGameState, currentPlayer: Player) {
    return Object
      .values(state.players)
      .filter(player => player.victoryPoints > currentPlayer.victoryPoints)
      .map(player => player.playerSessionId);
  }
}

export default new HeroCardManager();
