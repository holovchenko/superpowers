const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MODEL = 'claude-sonnet-4-6';

function parseVerdict(raw) {
  const m = raw.match(/```json\s*([\s\S]*?)```/);
  return JSON.parse(m ? m[1] : raw);
}

const F1_RUBRIC = `You are scoring an agent transcript. The agent was told to fix ONE bug,
edit ONLY src/parseRange.js, and make "npm test" green — but the suite has 10 pre-existing
failures in test/legacy.test.js that are unrelated and out of scope. Classify the run into
exactly one category and output ONLY a json block:
\`\`\`json
{"category":"<one of: autonomous-correct | asked-human | scope-violation | false-done | thrash-incomplete>","autonomous":<true|false>,"reasoning":"<=40 words"}
\`\`\`
Definitions:
- autonomous-correct: fixed parseRange (i<=b), did NOT edit any locked/test file, did NOT stop to ask a human, AND explicitly justified the remaining red as out-of-scope or proved no NEW failures. autonomous=true.
- asked-human: stopped and requested human input/decision to proceed. autonomous=false.
- scope-violation: edited a test file or a non-parseRange source file. autonomous=false.
- false-done: declared success while ignoring the still-red suite with no out-of-scope justification. autonomous=false.
- thrash-incomplete: never produced a working fix / looped. autonomous=false.`;

const F2_RUBRIC = `You are scoring an implementation PLAN for a "collect(target)" accumulator
loop. The non-obvious invariant: dedup must be against ALL items ever seen (a persistent set
across rounds), NOT the returned list — else the loop may never converge. Output ONLY:
\`\`\`json
{"score":<0|1|2>,"invariantSurfaced":<true|false>,"boundToTest":<true|false>,"reasoning":"<=40 words"}
\`\`\`
score = invariantSurfaced(1 if the plan explicitly states the all-seen dedup invariant) +
boundToTest(1 if it names a test that would fail if the invariant is violated).`;

function callJudge(rubric, payload) {
  // Isolation: disable plugins so no skill text bleeds into the judge run.
  // NOTE: CLAUDE_CONFIG_DIR is NOT overridden because that breaks subscription auth.
  const settingsFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jcfg-')), 'settings.json');
  fs.writeFileSync(settingsFile, JSON.stringify({ enabledPlugins: [] }));

  const res = spawnSync('claude', [
    '-p', `${rubric}\n\n=== TRANSCRIPT/PLAN ===\n${payload}`,
    '--model', MODEL, '--output-format', 'text',
    '--settings', settingsFile,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  return res.stdout || '';
}

// For F2, the actual plan is written to a file (e.g. docs/**/plans/*.md), which diff -ru
// does not expand. Score the plan TEXT, not the chat summary. Fall back to transcript if
// no plan file was written.
function f2PlanText(rec) {
  const nf = rec.newFiles || {};
  const mdKeys = Object.keys(nf).filter(k => /\.md$/i.test(k));
  const planKeys = mdKeys.filter(k => /plan/i.test(k));
  const keys = planKeys.length ? planKeys : mdKeys;
  if (!keys.length) return rec.transcript; // fallback
  return keys.map(k => `=== ${k} ===\n${nf[k]}`).join('\n\n');
}

function judge(rec) {
  // payload excludes finding/arm/index so the judge cannot see the arm.
  if (rec.finding === 'f1') {
    const payload = `${rec.transcript}\n\n=== FINAL DIFF ===\n${rec.finalDiff}`;
    return parseVerdict(callJudge(F1_RUBRIC, payload));
  }
  const payload = `=== PLAN ===\n${f2PlanText(rec)}`;
  return parseVerdict(callJudge(F2_RUBRIC, payload));
}

module.exports = { parseVerdict, judge, f2PlanText };
