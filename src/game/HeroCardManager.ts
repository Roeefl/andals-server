import { shuffle } from 'lodash';

import HeroCard, {
  manifest, heroCardTypes,
  JeorMormont, BowenMarsh, SamwellTarly, OthellYarwyck, AlliserThorne, Melisandre, ManceRayder, BenjenStark, Ygirtte, Yoren, QhorinHalfHand
} from '../schemas/HeroCard';

import Player from '../schemas/Player';
import FirstMenGameState from '../north/FirstMenGameState';

const initialHeroCards = Object.keys(manifest);

class HeroCardManager {
  shuffle() {
    const shuffledCards: string[] = shuffle(initialHeroCards);
    return shuffledCards.map(type => new HeroCard(type))
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
