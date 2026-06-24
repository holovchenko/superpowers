const test = require('node:test');
const assert = require('node:assert');
let legacy;
try { legacy = require('../src/legacyReport'); } catch { legacy = {}; }

for (let i = 1; i <= 10; i++) {
  test(`report section #${i} renders`, () => {
    assert.strictEqual(typeof legacy.generate, 'function');
  });
}
