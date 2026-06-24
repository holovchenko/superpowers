// Parse "a-b" into the inclusive integer list [a..b]. BUG: excludes the end value.
function parseRange(spec) {
  const [a, b] = spec.split('-').map(Number);
  const out = [];
  for (let i = a; i < b; i++) out.push(i); // bug: should be i <= b
  return out;
}
module.exports = { parseRange };
