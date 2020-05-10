import { ArraySchema } from '@colyseus/schema';

import FirstMenGameState from '../north/FirstMenGameState';

import WildlingToken from '../schemas/WildlingToken';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';
import Wildling from '../schemas/Wildling';

import {
  totalTokens,
  clanNames,
  wildlingTypes,
  clansManifest,
  trailRoutes,
  tokensPerPurchase,
  WILDLING_REGULAR,
  WILDLING_CLIMBER,
  WILDLING_GIANT,
  WILDLING_WHITE_WALKER
} from '../specs/wildlings';
import { ClanManifest } from '../interfaces';
import { MESSAGE_WILDLINGS_ADVANCE_CLEARING, MESSAGE_WILDLINGS_WALL_BATTLE } from '../constants';

interface WildlingsAdvanceSummary {
  invader: Wildling | null
  guardsKilled: number
}

class WildlingManager {
  shuffleTokens(): WildlingToken[] {
    return Array(totalTokens)
      .fill(0)
      .map(x => {
        const randomTypeIndex = Math.floor(Math.random() * (wildlingTypes.length + 2));
        const adjustedIndex = randomTypeIndex < wildlingTypes.length
          ? randomTypeIndex
          : 0;
          
        const wildlingType = wildlingTypes[adjustedIndex];
          
        const randomClan = Math.floor(Math.random() * clanNames.length);
        const clanType = clanNames[randomClan];

        return new WildlingToken(wildlingType, clanType);
      });
  }

  onBotPurchase(state: FirstMenGameState, purchaseType: string): WildlingToken[] {
    const tokensToPlay = tokensPerPurchase[purchaseType];
    const tokens = state.wildlingTokens.slice(0, tokensToPlay);

    this.onTokensRevealed(state, tokensToPlay);
    return tokens;
  }

  onTokensRevealed(state: FirstMenGameState, tokensToPlay: number): void {
    for (let t = 0; t < tokensToPlay; t++) {
      const currentToken = state.wildlingTokens[t];
      console.log("WildlingManager -> onTokensRevealed -> currentToken", currentToken.clanType, currentToken.wildlingType);

      this.playToken(state, currentToken);
    };

    const updatedWildlingTokens = state.wildlingTokens.slice(tokensToPlay);

    state.wildlingTokens = new ArraySchema<WildlingToken>(
      ...updatedWildlingTokens
    );
  }

  playToken(state: FirstMenGameState, token: WildlingToken): void {
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

    const addedWildling = new Wildling(wildlingType);
    const updatedCamps: Wildling[] = [
      ...currentClan.camps,
      addedWildling
    ];
    
    currentClan.camps = new ArraySchema<Wildling>(
      ...updatedCamps
    );

    if (currentClan.camps.length > currentClan.campfires || wildlingType === WILDLING_WHITE_WALKER)
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
  wildlingsRush(state: FirstMenGameState, clan: ClanArea): void {
    const [firstWildling, secondWildling] = clan.camps;

    const clanManifest: ClanManifest = clansManifest[clan.clanType];
    const [firstClearingIndex, secondClearingIndex] = clanManifest.clearings;

    const firstClearing = state.wildlingClearings[firstClearingIndex];
    this.wildlingAdvancesToClearing(state, clan, firstClearing, firstWildling);

    const secondClearing = state.wildlingClearings[secondClearingIndex];
    this.wildlingAdvancesToClearing(state, clan, secondClearing, secondWildling);
  }

  removeWildlingsFromClearing(clearing: WildlingClearing, wildlingType: string) {
    const updatedClearing: Wildling[] = clearing.wildlings
      .filter(({ type }) => type !== wildlingType);

    clearing.wildlings = new ArraySchema<Wildling>(
      ...updatedClearing
    );
  }

  removeWildlingFromClearing(state: FirstMenGameState, clearingIndex: number, wildlingIndex: number) {
    const clearing = state.wildlingClearings[clearingIndex];

    const updatedClearing: Wildling[] = clearing.wildlings
      .filter((w, index) => index !== wildlingIndex);

    clearing.wildlings = new ArraySchema<Wildling>(
      ...updatedClearing
    );
  }

  removeWildlingFromCamp(state: FirstMenGameState, clanName: string, campIndex: number) {
    const clan: ClanArea = state.clanAreas[clanName];

    const removedWildlingType = clan.camps[campIndex].type;
    
    const updatedCamps: Wildling[] = clan.camps.filter((w, index) => index !== campIndex);
    clan.camps = new ArraySchema<Wildling>(
      ...updatedCamps
    );

    state.spawnCounts[removedWildlingType]++;
  }

  evaluateClearing(state: FirstMenGameState, clearing: WildlingClearing, recentWildling: Wildling, lastDice?: number): WildlingsAdvanceSummary  {
    const { clearingIndex } = clearing;
    console.log("WildlingManager -> clearingIndex", clearingIndex)

    const guardsOnWallSection = state.guardsOnWallSection(clearingIndex);
    console.log("WildlingManager -> guardsOnWallSection", guardsOnWallSection)
    
    let guardsKilled = 0;

    switch (recentWildling.type) {
      case WILDLING_CLIMBER:
        this.onWildlingsInvade(state, clearing, [recentWildling], lastDice);
        this.removeWildlingsFromClearing(clearing, recentWildling.type);

        return { invader: recentWildling, guardsKilled: 0 };

      case WILDLING_GIANT:
        if (!guardsOnWallSection) {
          this.onWallBreach(state, clearing, lastDice);
        } else {
          state.onGuardKilled(clearingIndex, 0, true);
          ++guardsKilled;
        }

        this.removeWildlingsFromClearing(clearing, recentWildling.type);
        state.spawnCounts[WILDLING_GIANT]++;

        return { invader: null, guardsKilled };

      case WILDLING_REGULAR:
        const regularWildlingsInClearing = clearing.wildlingsCountOfType(WILDLING_REGULAR);
        console.log("WildlingManager -> regularWildlingsInClearing", regularWildlingsInClearing, ' >? ', guardsOnWallSection)

        if (regularWildlingsInClearing <= guardsOnWallSection)
          return { invader: null, guardsKilled: 0 };

        // More regular widllings than guards - BREACH!
        state.wallBreaches++;

        if (guardsOnWallSection > 0) {
          state.onGuardKilled(clearingIndex, 0, true);
          ++guardsKilled
        }
          
        this.onWildlingsInvade(state, clearing, clearing.wildlingsOfType(WILDLING_REGULAR), lastDice);
        this.removeWildlingsFromClearing(clearing, recentWildling.type);
        
        return { invader: recentWildling, guardsKilled };

      case WILDLING_WHITE_WALKER:
        this.onWallBreach(state, clearing, lastDice, false);

        guardsKilled = guardsKilled + guardsOnWallSection;
        state.onAllGuardsKilled(clearingIndex);

        this.removeWildlingsFromClearing(clearing, recentWildling.type);
        state.spawnCounts[WILDLING_WHITE_WALKER]++;

        return { invader: null, guardsKilled };

      default:
        break;
    }
    
    return null;
  }

  onWallBreach(state: FirstMenGameState, breachedClearing: WildlingClearing, lastDice?: number, invade: boolean = true): void {
    state.wallBreaches++;
    
    // Then, one at a time, each of the wildlings on that clearing jumps over the Wall.
    if (invade)
      this.onWildlingsInvade(state, breachedClearing, breachedClearing.wildlings, lastDice);
  }
  
  // blocks the first hex not occupied by a wildling directly south of the wall section.
  onWildlingsInvade(state: FirstMenGameState, clearing: WildlingClearing, wildlings: Wildling[], lastDice?: number): void { 
    const trailRoute = trailRoutes[lastDice || clearing.trails[0]];
    
    wildlings.forEach(wildling => {
      let hasInvaded = false;
      let step = 0;

      while (!hasInvaded && step < trailRoute.length) {
        const tileIndex = trailRoute[step];
        const currentTile = state.board[tileIndex];
        
        if (!currentTile.occupiedBy) {
          state.board[tileIndex].occupiedBy = wildling;
          wildling.occupiesTile = tileIndex;
          hasInvaded = true;
        }

        ++step;
      }
    });
  }

  // Advance through trails on matching rolls
  wildlingsAdvance(state: FirstMenGameState, wildlingDice: number, broadcast: (type: string, data: any, isAttention?: boolean) => void) {
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

            const wildlingsAdvanceSummary: WildlingsAdvanceSummary = this.wildlingAdvancesToClearing(state, clan, clearing, firstWildling, wildlingDice);
            const { invader, guardsKilled } = wildlingsAdvanceSummary;
            
            if (invader) {
              broadcast(MESSAGE_WILDLINGS_WALL_BATTLE, { invader, guardsKilled }, true);
            }
            else {
              broadcast(MESSAGE_WILDLINGS_ADVANCE_CLEARING, { wildling: firstWildling, guardsKilled }, true);
            }
          }
        };
      });
  }

  wildlingAdvancesToClearing(state: FirstMenGameState, clan: ClanArea, clearing: WildlingClearing, wildling: Wildling, wildlingDice?: number): WildlingsAdvanceSummary {
    // No wildlings to advance from camps to clearing
    if (!clan.camps.length) return;

    const advancingWildling: Wildling = new Wildling(clan.camps[0].type);
    
    const updatedCamps: Wildling[] = clan.camps.slice(1);
    clan.camps = new ArraySchema<Wildling>(
      ...updatedCamps
    );

    const updatedClearing: Wildling[] = [
      ...clearing.wildlings,
      advancingWildling
    ];
    clearing.wildlings = new ArraySchema<Wildling>(
      ...updatedClearing
    );

    // Assess clearing
    return this.evaluateClearing(state, clearing, wildling, wildlingDice);
  }
}

export default new WildlingManager();
