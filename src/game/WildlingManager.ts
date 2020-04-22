import { ArraySchema, MapSchema } from '@colyseus/schema';

import FirstMenGameState from '../north/FirstMenGameState';

import WildlingToken from '../schemas/WildlingToken';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';

import { totalTokens, clanNames, wildlingTypes, clansManifest, WILDLING_REGULAR, WILDLING_CLIMBER, WILDLING_GIANT } from '../specs/wildlings';
import { ClanManifest } from '../interfaces';
import { MESSAGE_WILDLINGS_ADVANCE_CLEARING, MESSAGE_WILDLINGS_WALL_BATTLE } from '../constants';

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
      console.log("WildlingManager -> onPurchaseWithTokens -> currentToken", currentToken.clanType, currentToken.wildlingType);

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

  evaluateClearing(state: FirstMenGameState, clearing: WildlingClearing, recentWildling: string): String | null {
    const { clearingIndex } = clearing;
    const guardsOnWallSection = state.guardsOnWallSection(clearingIndex);

    if (recentWildling === WILDLING_CLIMBER) {
      this.onWildlingsInvade([recentWildling]);
      return WILDLING_CLIMBER;
    }

    if (recentWildling === WILDLING_GIANT) {
      if (!guardsOnWallSection) {
        this.onWallBreach(state, clearing);
      };

      state.onGuardKilled(clearingIndex);
      state.spawnCounts[WILDLING_GIANT]++;
      return WILDLING_GIANT;
    }

    if (recentWildling === WILDLING_REGULAR) {
      const regularWildlingsInClearing = clearing.counts[WILDLING_REGULAR];

      if (regularWildlingsInClearing > guardsOnWallSection) {
        this.onWildlingsInvade(Array(regularWildlingsInClearing).fill(WILDLING_REGULAR));

        state.onGuardKilled(clearingIndex);
        this.onWallBreach(state, clearing);

        return WILDLING_REGULAR;
      };
    }
    
    return null;
  }

  onWallBreach(state: FirstMenGameState, breachedClearing: WildlingClearing) {
    state.wallBreaches++;

    // Then, one at a time, each of the wildlings on that clearing jumps over the Wall.
    this.onWildlingsInvade(breachedClearing.allWildlings);
  }
  
  onWildlingsInvade(wildlings: string[]) { 
    // blocks the first hex not occupied by a wildling directly south of the wall section.
    // occupiedBy
  }

  // Advance through trails on matching rolls
  wildlingsAdvance(state: FirstMenGameState, wildlingDice: number, broadcast: (type: string, data: any, isEssential?: boolean) => void) {
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
            const invader = this.wildlingAdvancesToClearing(state, clan, clearing, firstWildling);
            
            if (invader)
              broadcast(MESSAGE_WILDLINGS_WALL_BATTLE, { invader }, true);
            else
              broadcast(MESSAGE_WILDLINGS_ADVANCE_CLEARING, { wildling: firstWildling }, true);
          }
        };
      });
  }

  wildlingAdvancesToClearing(state: FirstMenGameState, clan: ClanArea, clearing: WildlingClearing, wildling: string): String | null {
    const updatedCamps: string[] = clan.camps.slice(1);
    clan.camps = new ArraySchema<string>(
      ...updatedCamps
    );

    clearing.counts = new MapSchema<Number>({
      ...clearing.counts,
      [wildling]: clearing.counts[wildling] + 1
    });

    // Assess clearing
    return this.evaluateClearing(state, clearing, wildling);
  }
}

export default new WildlingManager();
