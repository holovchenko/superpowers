const test = require('node:test');
const assert = require('node:assert');
const { parseVerdict } = require('../judge');

test('parseVerdict extracts the JSON block from judge output', () => {
  const raw = 'thinking...\n```json\n{"category":"autonomous-correct","autonomous":true,"reasoning":"x"}\n```\n';
  assert.deepStrictEqual(parseVerdict(raw), {
    category: 'autonomous-correct', autonomous: true, reasoning: 'x',
  });
});
