import { type, Schema } from '@colyseus/schema';

interface cardManifest {
  title: string
  description: string
};

const manifest: { [type: string] : cardManifest }  = {
  // A "Knight" card allows a player to move the robber to any spot on the board
  // and then gets to take a card from any player that has a settlement or city on the blocked resource.
  knight: {
    title: 'knight',
    description: 'A fiercesome Knight'
  },
  // A "Victory Point" card automatically gives the player one victory point.
  victoryPoint: {
    title: 'Victory Point',
    description: 'Forward, to Victory!'
  },
  // A "Road Building" card allows a player to place two roads on the board.
  roadBuilding: {
    title: 'Road Building',
    description: 'Pull this card to build 2 roads anywhere'
  },
  // A "Year of Plenty" card gives a player any two resource cards.
  yearOfPlenty: {
    title: 'Year of Plenty',
    description: 'You get good shit'
  },
  // After a player plays the "Monopoly" card, that player announces one type of resource.
  // Every player must then give that player all of that type of resource card(s) in their hand.
  monopoly: {
    title: 'Monopoly',
    description: 'Ask others for their stuff'
  }
};

class GameCard extends Schema {
  @type("string")
  type: string;

  @type("string")
  title: string

  @type("string")
  description: string

  @type("boolean")
  wasPlayed: boolean = false

  constructor(type: string) {
    super();
    
    this.type = type;
    this.title = manifest[type].title;
    this.description = manifest[type].description;
  }
};

export default GameCard;
