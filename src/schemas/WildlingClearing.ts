import { type, Schema, ArraySchema } from '@colyseus/schema';
import Wildling from './Wildling';

class WildlingClearing extends Schema {
  @type("number")
  clearingIndex: number

  @type(["number"])
  trails: number[]

  @type(["string"])
  clans: string[]

  @type([Wildling])
  wildlings: Wildling[]

  constructor(clearingIndex: number, trails: number[], clans: string[]) {
    super();

    this.clearingIndex = clearingIndex;

    this.trails = new ArraySchema<number>(
      ...trails
    )

    this.clans = new ArraySchema<string>(
      ...clans
    );
    
    this.wildlings = new ArraySchema<Wildling>();
  }

  wildlingsOfType(type: string) {
    return this.wildlings.filter(wildling => wildling.type === type);
  }

  wildlingsCountOfType(type: string) {
    return this.wildlingsOfType(type).length;
  }
};

export default WildlingClearing;
