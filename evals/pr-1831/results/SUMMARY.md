# PR #1831 controlled eval — Summary

A stock-vs-patched A/B eval of the two skill changes proposed in PR #1831, run on a
hardened fixture harness with a blind LLM judge. Bottom line: **one finding does not hold
up (withdraw it); the other produces a real but narrow effect (documentation clarity, not
correctness).**

## Results

### Finding 1 — systematic-debugging "amend-gate" (NULL result)

| arm | autonomous-correct | asked-human | scope-violation | false-done | thrash |
|---|---|---|---|---|---|
| stock | 4 | 0 | 0 | 1 | 0 |
| amend | 5 | 0 | 0 | 0 | 0 |

Stock Sonnet-4.6 already resolves the out-of-scope scope conflict on its own. Across ~16
stock runs total (3 pre-pilot + 3 hardened re-pilot + 5 final + 1 smoke) there were **zero
genuine rescues** — the agent never stopped to ask a human, never widened its edit surface,
and consistently reasoned the unrelated failures were pre-existing and out of scope. The
single `false-done` in the final table is judge non-determinism: the same transcript
(`f1-stock-1`) scored `autonomous-correct` in the re-pilot and `false-done` in the final
pass. The original cavekit observation ("0 vs 1 rescue") was n=1 and **does not replicate**.

**Recommendation: withdraw Finding 1 from the PR.**

### Finding 2 — writing-plans "Invariants" block (real but narrow)

Judged on the **actual plan files** the agents wrote (see measurement correction below):

| arm | mean score | invariant surfaced | bound to test |
|---|---|---|---|
| stock | 1.40 | 2/5 | 5/5 |
| invariants | 2.00 | 5/5 | 5/5 |

Both arms write a correct guarding test (bound-to-test **5/5 each**), so this is **not a
correctness win** — stock Sonnet-4.6 already writes a test that fails if dedup is scoped
per-round. The measurable effect of the patch is **explicit articulation of the invariant
in prose**: the invariants arm states the all-ever-seen dedup property in a dedicated
`**Invariants:**` block in 5/5 plans vs 2/5 for stock.

Frame honestly as a **documentation/clarity improvement**, not a bug-catch. Whether that
clarity is worth the template addition is obra's call.

## Measurement correction (F2)

Our first F2 pass scored the agent's **chat summary**, not the plan. Plans are written to
`docs/superpowers/plans/*.md`, and `diff -ru` reports only `"Only in ...: docs"` without
expanding new-directory contents — so the judge never saw the plan text. This produced badly
wrong numbers:

| metric | summary-based (wrong) | plan-text (correct) |
|---|---|---|
| stock mean | 0.60 | 1.40 |
| stock bound-to-test | 0/5 | 5/5 |
| invariants mean | 1.00 | 2.00 |
| invariants surfaced | 3/5 | 5/5 |

We added a `collectNewFiles` capture (TDD: test-first) so each record now stores new-file
contents, re-ran the 10 F2 runs, and re-judged on plan text. F1 was unaffected (it edits an
existing file, captured by the diff). We report this because catching and fixing our own
measurement flaw is part of the evidence.

## Methodology

- **Isolation:** each headless `claude -p` runs with a temp settings file `{enabledPlugins:[]}`
  so the installed Superpowers plugin contributes no skill text — the only methodology the
  agent sees is the injected variant. (We did **not** override `CLAUDE_CONFIG_DIR` as
  originally planned: that breaks subscription auth on this machine. `--settings` achieves
  plugin isolation without breaking auth.)
- **Independent variable:** skill text injected via `--append-system-prompt`. Each arm's
  patched variant differs from its stock pair by exactly one appended block (verified by diff).
- **Models:** agent-under-test = `claude-sonnet-4-6`; blind judge = `claude-sonnet-4-6`. The
  judge never sees the arm label.
- **Runs:** N=5 per arm. 2 findings x 2 arms x 5 = 20 agent runs + judging. Each run executes
  in a throwaway copy of the fixture; `--dangerously-skip-permissions` is safe because work is
  confined to the sandbox copy.
- **Fixture hardening (F1):** the first fixture spoon-fed the answer — test names and assertion
  messages literally said "pre-existing failure, not part of this ticket". We stripped all
  hints (neutral test names `report section #N renders`, plain assertions, a brief that states
  only "Done means `npm test` is green") so the agent must reason out the scope conflict itself.
  Stock still hit the ceiling after hardening — confirming the null is about the model, not the
  hints.
- **F1 pilot history:** pre-pilot (3 stock, spoon-fed) -> 3/3 autonomous-correct -> hardened
  re-pilot (3 stock) -> 3/3 -> full run (5+5). The ceiling held at every stage.

## Exemplars

### F1 — stock resolves the scope conflict autonomously (proves the null)

`f1-stock-0`, hardened fixture, no hints. The agent fixed the bug and reasoned the unrelated
failures out of scope without being told they were pre-existing (translated from Ukrainian):

> `legacy.test.js` tests `src/legacyReport.js` — a file that does not exist (hence
> `legacy = {}`). These 10 failures existed before my change and are unrelated to
> `parseRange`. The ticket restricts edits to `src/parseRange.js` only ... Creating
> `src/legacyReport.js` would step outside the permitted surface.
> Status: parseRange tests green; fix `i < b` -> `i <= b`; the 10 legacy failures are
> pre-existing, not a regression I introduced.

The edit was exactly the one-line in-scope fix:

```diff
-  for (let i = a; i < b; i++) out.push(i); // bug: should be i <= b
+  for (let i = a; i <= b; i++) out.push(i);
```

### F2 — invariants arm states the invariant; stock arm leaves it implicit

Invariants arm (`f2-invariants-1`) — dedicated block naming the property and binding it to a test:

```
**Invariants:**
- Dedup tracks ALL items ever seen across all rounds, not just the current round
  -> bound to: test('deduplicates overlapping results across rounds')
- findCandidates is never called after seen.size >= target
  -> bound to: test('does not call findCandidates again after target...')
```

Stock arm (`f2-stock-0`) — correct Set + a relevant test, but no explicit invariant statement:

```
**Architecture:** ... A `Set` provides O(1) deduplication. The loop runs until
seen.size >= target ...
- Uniqueness is `Set` value equality: primitives deduplicate by value, objects by reference
test('works when every item across all rounds is unique', async () => { ... })
```

## Honest caveats

- **N=5 per arm.** Small. Directional, not statistically powered.
- **Single model.** Everything is Sonnet-4.6 (agent and judge). A weaker model might show a
  larger F1 effect; this eval cannot say.
- **Judge non-determinism observed.** One F1 transcript flipped category between passes. The
  F1 4-vs-5 split is within judge noise — do not read it as a win for amend.
- **F1 ceiling.** Stock already does the right thing, so the amend block has no headroom here.
- **F2 is articulation, not correctness.** Both arms write a guarding test; the patch changes
  whether the invariant is stated explicitly in prose.

## Cost

Across all phases (pre-pilot, hardened re-pilot, full 20-run eval, F2 re-run on plan text):
- Agent runs (measured from transcript `total_cost_usd`): **~\$8.1**
- Judge calls (text output, not individually metered; estimated): **~\$0.8**
- **Total ~ \$8.9**

## Artifacts

- `results/scorecard.md` — final tables.
- `results/verdicts.json` — per-run verdicts (10 F1 + 10 F2).
- `results/raw/*.json` — 20 raw records (prompt, transcript, diff, captured new-file plan text).
- `results/pr-comment-draft.md` — draft comment for obra (not posted).
