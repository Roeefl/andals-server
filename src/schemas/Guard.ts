import { type, Schema } from '@colyseus/schema';
import { PURCHASE_GUARD } from '../manifest';

class Guard extends Schema {
  @type("string")
  ownerId: string

  @type("string")
  type: string

  @type("number")
  section: number

  @type("number")
  position: number

  constructor(ownerId: string, section: number, position: number) {
    super();
    
    this.ownerId = ownerId;
    this.type = PURCHASE_GUARD;
    this.section = section;
    this.position = position;
  }
};

export default Guard;
