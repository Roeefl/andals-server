import { type, Schema } from '@colyseus/schema';

class Road extends Schema {
  @type("string")
  ownerId: string

  constructor(ownerId: string) {
    super();
    
    this.ownerId = ownerId;
  }
};

export default Road;
