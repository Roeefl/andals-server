import { type, Schema } from '@colyseus/schema';

interface cardManifest {
  title: string
  description: string
};

const manifest: { [type:string] : cardManifest }  = {
  knight: {
    title: 'knight',
    description: 'A fiercesome Knight'
  },
  victoryPoint: {
    title: 'Victory Point',
    description: 'Forward, to Victory!'
  },
  roadBuilding: {
    title: 'Road Building',
    description: 'Pull this card to build 2 roads anywhere anytime'
  },
  yearOfPlenty: {
    title: 'Year of Plenty',
    description: 'You get good shit'
  },
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

  constructor(type: string) {
    super();
    
    this.type = type;
    this.title = manifest[type].title;
    this.description = manifest[type].description;
  }
};

export default GameCard;
