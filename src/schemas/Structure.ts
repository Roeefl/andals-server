import { type, Schema } from '@colyseus/schema';
import { STRUCTURE_SETTLEMENT } from '../manifest';

class Structure extends Schema {
  @type("string")
  type: string

  @type("string")
  ownerId: string

  constructor(ownerId: string, type: string = STRUCTURE_SETTLEMENT) {
    super();
    
    this.ownerId = ownerId;
    this.type = type;
  }
};

export default Structure;
