import { ArraySchema, MapSchema } from '@colyseus/schema';

import FirstMenGameState from '../north/FirstMenGameState';

import WildlingToken from '../schemas/WildlingToken';
import ClanCamps from '../schemas/ClanCamps';

import { totalTokens, clanNames, wildlingTypes, tokensPerPurchase, clansManifest } from '../specs/wildlings';

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

  onPurchaseWithTokens(state: FirstMenGameState, tokensToPlay: number) {
    for (let t = 0; t < tokensToPlay; t++) {
      const currentToken = state.wildlingTokens[t];
      console.log("WildlingManager -> onPurchaseWithTokens -> currentToken", currentToken.clanType, currentToken.wildlingType)
      this.playToken(state, currentToken);
    };

    const updatedWildlingTokens = state.wildlingTokens.slice(tokensToPlay);

    state.wildlingTokens = new ArraySchema<WildlingToken>(
      ...updatedWildlingTokens
    );
  }

  playToken(state: FirstMenGameState, token: WildlingToken) {
    const { wildlingType, clanType } = token;

    if (state.spawnCounts[wildlingType] < 1) {
      console.error('Unable to play token: ', wildlingType, clanType);
      return;
    }
    
    state.spawnCounts[wildlingType] = state.spawnCounts[wildlingType] - 1;

    const updatedCamps: string[] = [
      ...state.clanCamps[clanType].camps,
      wildlingType
    ];

    state.clanCamps[clanType].camps = new ArraySchema<string>(
      ...updatedCamps
    );
  }

  // Advance through trails on matching rolls
  onWildlingDiceRoll(state: FirstMenGameState, wildlingDice: number) {
    state.wildlingClearings
      .filter(({ trails }) => trails.includes(wildlingDice))
      .forEach(clearing => {
        const trailClan = Object
          .values(clansManifest)
          .find(manifest => manifest.trails.some(trails => trails.includes(wildlingDice)));

        if (trailClan) {
          const clan: ClanCamps = state.clanCamps[trailClan.name];

          if (clan.camps.length) {
            const [firstWildling] = clan.camps;

            const updatedCamps: string[] = clan.camps.slice(1);
            state.clanCamps[trailClan.name].camps = new ArraySchema<string>(
              ...updatedCamps
            );

            clearing.counts = new MapSchema<Number>({
              ...clearing.counts,
              [firstWildling]: clearing.counts[firstWildling] + 1
            });
          }
        };
      });
  }
}

export default new WildlingManager();
