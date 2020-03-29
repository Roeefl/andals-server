import { type, Schema } from '@colyseus/schema';

class Road extends Schema {
  @type("string")
  value: string = '';
};

export default Road;
