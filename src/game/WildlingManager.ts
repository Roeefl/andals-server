import { ArraySchema, MapSchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import WildlingToken from '../schemas/WildlingToken';

import { totalTokens, clanNames, wildlingTypes } from '../specs/wildlings';

class WildlingManager {
  shuffleTokens() {
    const tokens: WildlingToken[] = [];

    for (let t = 0; t < totalTokens; t++) {
      const randomType = Math.floor(Math.random() * wildlingTypes.length);
      const randomClan = Math.floor(Math.random() * clanNames.length);

      const token = new WildlingToken(wildlingTypes[randomType], clanNames[randomClan]);
      tokens.push(token);
    };

    return tokens;
  }
}

export default new WildlingManager();
