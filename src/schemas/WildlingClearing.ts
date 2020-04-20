import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import { WildlingCounts } from '../interfaces';
import { initialClearingWildlingCounts } from '../specs/wildlings';

class WildlingClearing extends Schema {
  @type(["number"])
  trails: number[]

  @type(["string"])
  clans: string[]

  @type({ map: "number" })
  counts: WildlingCounts

  constructor(trails: number[], clans: string[]) {
    super();

    this.trails = new ArraySchema<number>(
      ...trails
    )

    this.clans = new ArraySchema<string>(
      ...clans
    );
    
    this.counts = new MapSchema<Number>({
      ...initialClearingWildlingCounts
    });
  }
};

export default WildlingClearing;