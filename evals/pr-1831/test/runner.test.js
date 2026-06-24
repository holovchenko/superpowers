const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildPrompt, collectNewFiles } = require('../runner');

test('buildPrompt embeds brief and run index, not the arm label', () => {
  const p = buildPrompt({ brief: 'FIX THE BUG', index: 3, arm: 'amend' });
  assert.match(p, /FIX THE BUG/);
  assert.match(p, /Run instance: 3/);
  assert.doesNotMatch(p, /amend/); // arm must not leak into the agent prompt
});

test('collectNewFiles returns files only in the sandbox, excludes shared files', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-'));
  const box = fs.mkdtempSync(path.join(os.tmpdir(), 'box-'));
  // shared file present in both
  fs.writeFileSync(path.join(fixture, 'BRIEF.md'), 'brief');
  fs.writeFileSync(path.join(box, 'BRIEF.md'), 'brief');
  // new nested plan file only in sandbox
  fs.mkdirSync(path.join(box, 'docs/plans'), { recursive: true });
  fs.writeFileSync(path.join(box, 'docs/plans/plan.md'), 'THE PLAN');

  const map = collectNewFiles(fixture, box);
  assert.strictEqual(map['docs/plans/plan.md'], 'THE PLAN');
  assert.ok(!('BRIEF.md' in map), 'shared file must be excluded');
});
