const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = __dirname;
const MODEL = 'claude-sonnet-4-6';

function buildPrompt({ brief, index }) {
  return `${brief}\n\nRun instance: ${index}\nWork now. When done, stop.`;
}

// Copy a fixture into a throwaway sandbox and return its path.
function sandbox(fixtureDir) {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-'));
  fs.cpSync(fixtureDir, dst, { recursive: true });
  return dst;
}

function runClaude({ cwd, skillText, prompt }) {
  // Isolation: write a temp settings file with no plugins so the installed superpowers
  // plugin does not leak its own skill text and contaminate the independent variable.
  // NOTE: CLAUDE_CONFIG_DIR is NOT overridden because that breaks subscription auth.
  // --settings merges on top of existing settings; enabledPlugins:[] disables all plugins.
  const settingsFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'evalcfg-')), 'settings.json');
  fs.writeFileSync(settingsFile, JSON.stringify({ enabledPlugins: [] }));

  const res = spawnSync('claude', [
    '-p', prompt,
    '--model', MODEL,
    '--append-system-prompt', skillText,
    '--output-format', 'json',
    '--dangerously-skip-permissions',
    '--settings', settingsFile,
  ], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 900000,
  });
  return res.stdout || res.stderr || '';
}

function gitlessDiff(dir, fixtureDir) {
  // Capture which files changed vs the pristine fixture and their new contents.
  const out = spawnSync('diff', ['-ru', fixtureDir, dir], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return out.stdout || '';
}

// Walk the sandbox and collect every text file that did NOT exist in the pristine
// fixture, as { relpath: contents }. diff -ru does not expand new directories, so a
// plan written under docs/**/plans/*.md is invisible to gitlessDiff — this recovers it.
function collectNewFiles(fixtureDir, sandboxDir) {
  const SKIP = new Set(['node_modules', '.git']);
  const CAP = 50 * 1024;
  const map = {};
  function walk(rel) {
    const abs = path.join(sandboxDir, rel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) { walk(childRel); continue; }
      if (!entry.isFile()) continue;
      if (fs.existsSync(path.join(fixtureDir, childRel))) continue; // present in both → not new
      let buf;
      try { buf = fs.readFileSync(path.join(sandboxDir, childRel)); } catch { continue; }
      if (buf.includes(0)) continue; // skip binary
      map[childRel] = buf.toString('utf8').slice(0, CAP);
    }
  }
  walk('');
  return map;
}

function runOne({ finding, arm, index }) {
  const fixtureMap = {
    f1: path.join(ROOT, 'fixtures/f1-redbaseline'),
    f2: path.join(ROOT, 'fixtures/f2-invariant'),
  };
  const skillMap = {
    'f1-stock': 'skills/f1.stock.md', 'f1-amend': 'skills/f1.amend.md',
    'f2-stock': 'skills/f2.stock.md', 'f2-invariants': 'skills/f2.invariants.md',
  };
  const fixtureDir = fixtureMap[finding];
  const skillText = fs.readFileSync(path.join(ROOT, skillMap[`${finding}-${arm}`]), 'utf8');
  const brief = fs.readFileSync(path.join(fixtureDir, 'BRIEF.md'), 'utf8');
  const box = sandbox(fixtureDir);
  const prompt = buildPrompt({ brief, index });
  const transcript = runClaude({ cwd: box, skillText, prompt });
  const finalDiff = gitlessDiff(box, fixtureDir);
  const newFiles = collectNewFiles(fixtureDir, box);
  const rec = { finding, arm, index, prompt, transcript, finalDiff, newFiles };
  const outDir = path.join(ROOT, 'results/raw');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${finding}-${arm}-${index}.json`), JSON.stringify(rec, null, 2));
  fs.rmSync(box, { recursive: true, force: true });
  return rec;
}

module.exports = { buildPrompt, runOne, collectNewFiles };

if (require.main === module) {
  const [finding, arm, index] = process.argv.slice(2);
  runOne({ finding, arm, index: Number(index) });
}
