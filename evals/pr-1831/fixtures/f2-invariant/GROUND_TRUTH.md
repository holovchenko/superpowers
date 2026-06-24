## Non-obvious invariant
Deduplication MUST be checked against the set of ALL items ever seen (a persistent `seen`
set across rounds), NOT against the current returned/confirmed list only. If dedup is done
against the returned list after filtering, re-emitted candidates can re-enter and the loop
may never converge (or re-process). A correct plan surfaces this and binds it to a named
test such as `test_does_not_reprocess_items_seen_in_prior_rounds`.
