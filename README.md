# PR #1831 controlled eval — artifacts

Raw artifacts for the stock-vs-patched A/B eval discussed in
[obra/superpowers#1831](https://github.com/obra/superpowers/pull/1831).

- **`evals/pr-1831/results/scorecard.md`** — the two result tables (F1, F2).
- **`evals/pr-1831/results/SUMMARY.md`** — full write-up: methodology, the F2
  summary-vs-plan-text correction, exemplars, caveats.
- **`evals/pr-1831/results/raw/`** — all 20 raw run records (transcript + final diff
  + captured plan files), one JSON per run.
- **`evals/pr-1831/skills/`** — the stock and patched skill variants. Each `*.amend.md` /
  `*.invariants.md` differs from its `*.stock.md` pair by exactly one block.
- **`evals/pr-1831/fixtures/`** — the two deterministic fixtures (F1 red-baseline Node repo,
  F2 hidden-invariant planning brief).
- **`evals/pr-1831/runner.js`, `judge.js`** — isolated headless runner and blind judge.
- **`docs/`** — design and implementation plan for the eval.

Headline: **Finding 1 (systematic-debugging) did not replicate** (stock already handles it,
0 genuine rescues across 8 stock runs). **Finding 2 (writing-plans Invariants)** produces a
real but narrow effect — explicit invariant articulation (5/5 vs 2/5), not a correctness win
(both arms write the guarding test 5/5).

Local absolute paths in raw records were redacted to `<repo-root>` / `<home>`.
