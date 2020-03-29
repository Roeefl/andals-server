import { type, Schema } from '@colyseus/schema';
import { LUMBER, BRICK, SHEEP, WHEAT, ORE } from '../manifest';

const HARBOR_GENERIC = 'HARBOR_GENERIC';

class Harbor extends Schema {
  @type("string")
  type: string = HARBOR_GENERIC;
};

export default Harbor;
