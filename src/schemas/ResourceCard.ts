import { type, Schema } from '@colyseus/schema';
import { LUMBER, BRICK, SHEEP, WHEAT, ORE } from '../manifest';

class ResourceCard extends Schema {
  @type("string")
  type: string = LUMBER;

  constructor(type: string) {
    super();
    this.type = type;
  }
};

export default ResourceCard;
