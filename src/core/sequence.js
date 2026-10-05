// Extension seam for proprietary/custom bar construction such as Renko-Time or Sequence bars.
// Exact algorithms can be registered later without changing the chart UI.
const builders = new Map();
export function registerBarBuilder(name, builder) {
  if (!name || typeof builder !== 'function') throw new Error('A name and builder function are required');
  builders.set(name, builder);
}
export function buildCustomBars(name, source, options = {}) {
  const builder = builders.get(name);
  if (!builder) throw new Error(`Unknown custom bar builder: ${name}`);
  return builder(source, options);
}
export function listBarBuilders() { return [...builders.keys()]; }
