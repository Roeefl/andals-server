import { type, Schema } from '@colyseus/schema';

const types: string[] = ['settlement', 'city'];
export const [BUILDING_SETTLEMENT, BUILDING_CITY] = types;

class Building extends Schema {
  @type("string")
  type: string = BUILDING_SETTLEMENT;
};

export default Building;
