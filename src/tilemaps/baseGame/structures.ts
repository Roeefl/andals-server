export const types = {
  0: 'hide',
  1: 'top', // enables roads: north, south-west, south-east
  2: 'top-left' // enables roads: south, north-west, north-east
};

// 7 x 14
export default [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0],
  [0, 0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0],
  [0, 0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0],
  [0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, 0],
  [0, 0, 0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, 0],
  [0, 0, 0, 1, 2, 1, 2, 1, 2, 1, 0, 0, 0, 0]
];
