import { ArraySchema } from '@colyseus/schema';
import { shuffle } from 'lodash';

import HeroCard, {
  manifest, heroCardTypes,
  JeorMormont, BowenMarsh, SamwellTarly, OthellYarwyck, AlliserThorne, Melisandre, ManceRayder, BenjenStark, Ygritte, Yoren, QhorinHalfhand
} from '../schemas/HeroCard';

import Player from '../schemas/Player';
import FirstMenGameState from '../north/FirstMenGameState';

const initialHeroCards = Object.keys(manifest);

class HeroCardManager {
  shuffle() {
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

  playHeroCard(player: Player, type: string) {
    if (player.hasPlayedHeroCard) {
      // player.mustSwapHeroCard();
    }

    player.hasPlayedHeroCard = true;
    player.currentHeroCard.wasPlayed = true;
    player.heroPrivilege = type;
  }
}

export default new HeroCardManager();
