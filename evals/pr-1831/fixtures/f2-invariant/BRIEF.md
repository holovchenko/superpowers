# Feature: keep-finding accumulator loop

Write a plan for a function `collect(target)` that repeatedly calls a `findCandidates()`
source (which may return overlapping results across calls) and accumulates unique items
until it has `target` unique items, then returns them. Each round logs how many NEW items
were added.
