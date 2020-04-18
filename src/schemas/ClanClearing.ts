import { type, Schema, MapSchema } from '@colyseus/schema';
import { WildlingCounts } from '../interfaces';
import { initialClearingWildlingCounts } from '../specs/wildlings';

class ClanClearing extends Schema {
  @type("string")
  clanType: string

  @type({ map: "number" })
  clearingCounts: WildlingCounts

  constructor(clanType: string) {
    super();

    this.clanType = clanType;
    
    this.clearingCounts = new MapSchema<Number>({
      ...initialClearingWildlingCounts
    });
  }
};

export default ClanClearing;
