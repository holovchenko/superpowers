We ran the evals you asked for on PR #1831. Here's what they show — including that one of
the two findings doesn't hold up.

**Setup:** isolated headless `claude -p` (temp settings with `enabledPlugins:[]` so the
installed plugin injects no skill text), each arm's skill variant injected via
`--append-system-prompt` and differing from its stock pair by exactly one block. Agent and
blind judge both Sonnet-4.6; judge never sees the arm. N=5 per arm, throwaway sandbox per run.

---

**Finding 1 (systematic-debugging amend-gate): does not replicate — we're withdrawing it.**

| arm | autonomous-correct | asked-human | scope-violation | false-done | thrash |
|---|---|---|---|---|---|
| stock | 4 | 0 | 0 | 1 | 0 |
| amend | 5 | 0 | 0 | 0 | 0 |

Stock Sonnet-4.6 already handles the out-of-scope scope conflict on its own. Across 8 stock
runs (3 on the original fixture, 5 on the hardened one) there were zero genuine rescues — it
never asked a human and never widened its edit surface; it fixed the in-scope bug and reasoned
the unrelated failures were pre-existing. The lone `false-done` is judge non-determinism (same transcript
scored `autonomous-correct` on a prior pass). We even hardened the fixture — stripped the test
names and assertion messages that originally spelled out "pre-existing, out of scope" — and
stock still hit the ceiling. The original "0 vs 1 rescue" signal was n=1 and doesn't hold.

**Finding 2 (writing-plans Invariants block): real but narrow — a clarity improvement, your call.**

Judged on the actual plan files:

| arm | mean score | invariant surfaced | bound to test |
|---|---|---|---|
| stock | 1.40 | 2/5 | 5/5 |
| invariants | 2.00 | 5/5 | 5/5 |

Both arms write a correct guarding test (5/5 each), so it's not a correctness win — stock
already writes a test that fails if dedup is scoped per-round. The actual effect is explicit
articulation: the invariants arm states the non-obvious invariant in a dedicated
`**Invariants:**` block 5/5 of the time vs 2/5 for stock. That's a documentation/clarity gain,
not a bug-catch. Whether it's worth the template addition is your call.

**One correction worth flagging:** our first F2 pass scored the agent's chat summary, not the
plan file (`diff -ru` doesn't expand new directories, so the judge never saw
`docs/.../plans/*.md`). We caught it, added new-file capture, and re-judged on the real plan
text — the table above is the corrected version. The pre-correction numbers understated both
arms (stock looked like 0/5 bound-to-test when it's actually 5/5).

**Caveats:** N=5, single model (Sonnet-4.6 for both agent and judge), judge non-determinism
observed on F1. Directional, not statistically powered.

Raw transcripts, fixtures, runner/judge, and the scorecard are on branch `evals/pr-1831` in
the memory-bus repo if you want to inspect any run.

— Claude
