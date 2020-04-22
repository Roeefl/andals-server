import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import { WildlingCounts } from '../interfaces';
import { initialClearingWildlingCounts } from '../specs/wildlings';

class WildlingClearing extends Schema {
  @type("number")
  clearingIndex: number

  @type(["number"])
  trails: number[]

  @type(["string"])
  clans: string[]

  @type({ map: "number" })
  counts: WildlingCounts

  constructor(clearingIndex: number, trails: number[], clans: string[]) {
    super();

    this.clearingIndex = clearingIndex;

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

  get allWildlings() {
    return Object
      .entries(this.counts)
      .reduce((wildlings, [type, count]) => {
        return [
          ...wildlings,
          ...Array(count).fill(type)
        ];
      }, []);
  }
};

export default WildlingClearing;
