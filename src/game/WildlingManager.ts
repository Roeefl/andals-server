import { ArraySchema, MapSchema } from '@colyseus/schema';

import FirstMenGameState from '../north/FirstMenGameState';

import WildlingToken from '../schemas/WildlingToken';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';

import { totalTokens, clanNames, wildlingTypes, clansManifest, WILDLING_REGULAR, WILDLING_CLIMBER, WILDLING_GIANT } from '../specs/wildlings';
import { ClanManifest } from '../interfaces';

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

  /**
   * Deploys a single wildling from the spawn area to one of the clan camps
   *
   * @param {FirstMenGameState} state
   * @param {string} wildlingType
   * @param {string} clan: which clan to deploy to
   * @memberof WildlingManager
   */
  deployWildling(state: FirstMenGameState, wildlingType: string, clan: string) {
    state.spawnCounts[wildlingType]--;

    const currentClan: ClanArea = state.clanAreas[clan];

    const updatedCamps: string[] = [
      ...currentClan.camps,
      wildlingType
    ];
    
    currentClan.camps = new ArraySchema<string>(
      ...updatedCamps
    );

    if (currentClan.camps.length > currentClan.campfires)
      this.wildlingsRush(state, currentClan);
  }

  /**
   * When a fifth wildling moves to a clan area that already has 4 wildlings, a wildling rush occurs.
   * The wildlings in the two camps closest to the trails immediately advance.
   * The wildling in the lowest camp uses the lower numbered trail, and the wildling in the next closest camp uses the higher numbered trail
   *
   * @param {FirstMenGameState} state
   * @param {ClanArea} clan
   * @memberof WildlingManager
   */
  wildlingsRush(state: FirstMenGameState, clan: ClanArea) {
    const [firstWildling, secondWildling] = clan.camps;

    const clanManifest: ClanManifest = clansManifest[clan.clanType];
    const [firstClearing, secondClearing] = clanManifest.clearings;

    this.wildlingAdvancesToClearing(state, clan, state.wildlingClearings[firstClearing], firstWildling);
    this.wildlingAdvancesToClearing(state, clan, state.wildlingClearings[secondClearing], secondWildling);
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
    
    this.deployWildling(state, wildlingType, clanType);
  }

  wildlingAdvancesToClearing(state: FirstMenGameState, clan: ClanArea, clearing: WildlingClearing, wildling: string) {
    const updatedCamps: string[] = clan.camps.slice(1);
    clan.camps = new ArraySchema<string>(
      ...updatedCamps
    );

    clearing.counts = new MapSchema<Number>({
      ...clearing.counts,
      [wildling]: clearing.counts[wildling] + 1
    });

    // Assess clearing
    this.assessClearing(state, clearing, wildling);
  }

  assessClearing(state: FirstMenGameState, clearing: WildlingClearing, recentWildling: string) {
    const { clearingIndex } = clearing;
    const guardsOnWallSection = state.guardsOnWallSection(clearingIndex);

    if (recentWildling === WILDLING_CLIMBER) {
      this.wildlingsAdvanceToBoard([recentWildling]);
      return;
    }

    if (recentWildling === WILDLING_GIANT) {
      if (!guardsOnWallSection) {
        state.wallBreaches++
      };

      state.onGuardKilled(clearingIndex);
      state.spawnCounts[WILDLING_GIANT]++;
      return;
    }

    if (recentWildling === WILDLING_REGULAR) {
      const regularWildlingsInClearing = clearing.counts[WILDLING_REGULAR];

      if (regularWildlingsInClearing > guardsOnWallSection) {
        this.wildlingsAdvanceToBoard(Array(regularWildlingsInClearing).fill(WILDLING_REGULAR));
        state.wallBreaches++;
      };
    }
  }

  wildlingsAdvanceToBoard(wildlings: string[]) {
    // blocks the first hex not occupied by a wildling directly south of the wall section.
    // occupiedBy
  }

  // Advance through trails on matching rolls
  wildlingsAdvance(state: FirstMenGameState, wildlingDice: number) {
    state.wildlingClearings
      .filter(({ trails }) => trails.includes(wildlingDice))
      .forEach(clearing => {
        const trailClan = Object
          .values(clansManifest)
          .find(manifest => manifest.trails.some(trails => trails.includes(wildlingDice)));

        if (trailClan) {
          const clan: ClanArea = state.clanAreas[trailClan.name];

          if (clan.camps.length) {
            const [firstWildling] = clan.camps;
            this.wildlingAdvancesToClearing(state, clan, clearing, firstWildling);
          }
        };
      });
  }
}

export default new WildlingManager();
