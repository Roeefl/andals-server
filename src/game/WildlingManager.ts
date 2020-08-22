import { ArraySchema } from '@colyseus/schema';

import FirstMenGameState from '../north/FirstMenGameState';

import WildlingToken from '../schemas/WildlingToken';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';
import Wildling from '../schemas/Wildling';

import BroadcastService from '../services/broadcast';

import {
  totalTokens,
  clanNames,
  wildlingTokensPool,
  clansManifest,
  trailRoutes,
  tokensPerPurchase,
  WILDLING_REGULAR,
  WILDLING_CLIMBER,
  WILDLING_GIANT,
  WILDLING_WHITE_WALKER
} from '../specs/wildlings';
import { ClanManifest } from '../interfaces';
import { MESSAGE_WILDLINGS_ADVANCE_CLEARING, MESSAGE_WILDLINGS_WALL_BATTLE, MESSAGE_WILDLINGS_REVEAL_TOKENS } from '../constants';

class WildlingManager {
  broadcastService: BroadcastService

  constructor(broadcastService: BroadcastService) {
    this.broadcastService = broadcastService;
  }

  shuffleTokens(): WildlingToken[] {
    return Array(totalTokens)
      .fill(0)
      .map(x => {
        const randomType = Math.floor(Math.random() * wildlingTokensPool.length);
        const wildlingType = wildlingTokensPool[randomType];
          
        const randomClan = Math.floor(Math.random() * clanNames.length);
        const clanType = clanNames[randomClan];

        return new WildlingToken(wildlingType, clanType);
      });
  }

  onBotPurchase(state: FirstMenGameState, purchaseType: string) {
    const tokensToPlay = tokensPerPurchase[purchaseType];
    this.onTokensRevealed(state, tokensToPlay);
  }

  onTokensRevealed(state: FirstMenGameState, tokensToPlay: number) {
    const tokens = state.wildlingTokens.slice(0, tokensToPlay);
    this.broadcastService.broadcast(MESSAGE_WILDLINGS_REVEAL_TOKENS, { tokens }, true);

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
  wildlingsRush(state: FirstMenGameState, clan: ClanArea) {
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

  evaluateClearing(state: FirstMenGameState, clearing: WildlingClearing, recentWildling: Wildling, lastDice?: number) {
    const { clearingIndex } = clearing;
    console.log("WildlingManager -> clearingIndex", clearingIndex)

    const guardsOnWallSection = state.guardsOnWallSection(clearingIndex);
    console.log("WildlingManager -> guardsOnWallSection", guardsOnWallSection)

    switch (recentWildling.type) {
      case WILDLING_CLIMBER:
        this.onWildlingsInvade(state, clearing, [recentWildling], lastDice);
        this.removeWildlingsFromClearing(clearing, WILDLING_CLIMBER);

        this.broadcastService.broadcast(MESSAGE_WILDLINGS_WALL_BATTLE, { invaderType: WILDLING_CLIMBER, guardsKilled: 0 }, true);
        break;

      case WILDLING_GIANT:
        let guardsKilledByGiant = 0;

        if (!guardsOnWallSection) {
          this.onWallBreach(state, clearing, lastDice, false);
        } else {
          ++guardsKilledByGiant;
          state.onGuardKilled(clearingIndex, 0, true);
        }

        this.removeWildlingsFromClearing(clearing, WILDLING_GIANT);
        state.spawnCounts[WILDLING_GIANT]++;

        this.broadcastService.broadcast(MESSAGE_WILDLINGS_WALL_BATTLE, { wildlingType: WILDLING_GIANT, guardsKilled: guardsKilledByGiant }, true);
        break;

      case WILDLING_REGULAR:
        const regularWildlingsInClearing = clearing.wildlingsCountOfType(WILDLING_REGULAR);
        console.log("WildlingManager -> regularWildlingsInClearing", regularWildlingsInClearing, ' >? ', guardsOnWallSection)

        if (regularWildlingsInClearing <= guardsOnWallSection) {
           this.broadcastService.broadcast(MESSAGE_WILDLINGS_ADVANCE_CLEARING, { wildlingType: WILDLING_REGULAR, guardsKilled: 0 }, true);
           return;
        }
        
        // More regular widllings than guards - BREACH!
        this.onWallBreach(state, clearing, lastDice);
        this.removeWildlingsFromClearing(clearing, WILDLING_REGULAR);

        let guardsKilledByRegulars = 0;
        if (guardsOnWallSection > 0) {
          ++guardsKilledByRegulars;
          state.onGuardKilled(clearingIndex, 0, true);
        }

        this.broadcastService.broadcast(MESSAGE_WILDLINGS_WALL_BATTLE, { invaderType: WILDLING_REGULAR, guardsKilled: guardsKilledByRegulars }, true);
        break;

      case WILDLING_WHITE_WALKER:
        this.removeWildlingsFromClearing(clearing, WILDLING_WHITE_WALKER);
        state.spawnCounts[WILDLING_WHITE_WALKER]++;

        state.onAllGuardsKilled(clearingIndex);
        this.onWallBreach(state, clearing, lastDice);

        this.broadcastService.broadcast(MESSAGE_WILDLINGS_WALL_BATTLE, { wildlingType: WILDLING_WHITE_WALKER , guardsKilled: guardsOnWallSection }, true);
        break;
    }
  }

  onWallBreach(state: FirstMenGameState, breachedClearing: WildlingClearing, lastDice?: number, invade: boolean = true) {
    state.wallBreaches++;
    
    // Then, one at a time, each of the wildlings on that clearing jumps over the Wall.
    if (invade)
      this.onWildlingsInvade(state, breachedClearing, breachedClearing.wildlings, lastDice);
  }
  
  // blocks the first hex not occupied by a wildling directly south of the wall section.
  onWildlingsInvade(state: FirstMenGameState, clearing: WildlingClearing, wildlings: Wildling[], lastDice?: number) { 
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
            this.wildlingAdvancesToClearing(state, clan, clearing, firstWildling, wildlingDice);
          }
        };
      });
  }

  wildlingAdvancesToClearing(state: FirstMenGameState, clan: ClanArea, clearing: WildlingClearing, wildling: Wildling, wildlingDice?: number) {
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
    this.evaluateClearing(state, clearing, wildling, wildlingDice);
  }
}

export default WildlingManager;
