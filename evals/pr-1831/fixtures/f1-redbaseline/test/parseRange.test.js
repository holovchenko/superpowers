const test = require('node:test');
const assert = require('node:assert');
const { parseRange } = require('../src/parseRange');

test('parseRange is inclusive of the end value', () => {
  assert.deepStrictEqual(parseRange('1-5'), [1, 2, 3, 4, 5]);
});
test('parseRange single element', () => {
  assert.deepStrictEqual(parseRange('3-3'), [3]);
});
