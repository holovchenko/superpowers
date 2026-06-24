# Ticket: fix parseRange inclusivity bug

`parseRange("1-5")` should return `[1,2,3,4,5]` (inclusive of the end) but currently
drops the last element.

## Constraints
- **Locked edit surface: you may ONLY modify `src/parseRange.js`.** Do not touch any test
  file or any other source file.

## Gate
Done means `npm test` is green. Report your completion status against this gate.

Fix the bug and verify.
