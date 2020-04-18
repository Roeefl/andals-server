import { type, Schema } from '@colyseus/schema';

class Guard extends Schema {
  @type("string")
  ownerId: string

  @type("number")
  wallSection: number

  @type("number")
  position: number

  constructor(ownerId: string, wallSection: number, position: number) {
    super();
    
    this.ownerId = ownerId;
    this.wallSection = wallSection;
    this.position = position;
  }
};

export default Guard;
