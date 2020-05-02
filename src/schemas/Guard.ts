import { type, Schema } from '@colyseus/schema';

class Guard extends Schema {
  @type("string")
  ownerId: string

  @type("number")
  section: number

  @type("number")
  position: number

  constructor(ownerId: string, section: number, position: number) {
    super();
    
    this.ownerId = ownerId;
    this.section = section;
    this.position = position;
  }
};

export default Guard;
