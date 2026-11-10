/**
 * Owned concern: immutable validation steps and consistent execution identities.
 * @baseline Local Changed Files Gate: a selected obligation cannot disappear by ID collision.
 * @decision Deduplicate only identical command, arguments and test classification.
 * @consequence Plan construction rejects conflicting identities before execution.
 * @version 1.0.0
 */
function step(id, command, ...args) {
  return Object.freeze({ id, command, args: Object.freeze(args) });
}

function testStep(id, command, ...args) {
  return Object.freeze({ ...step(id, command, ...args), kind: 'test' });
}

function normalizeChangedFiles(files) {
  return Array.from(new Set(files.map((file) => file.replaceAll('\\', '/')))).sort();
}

function commandLabel(value) {
  return [value.command, ...(value.args || [])].join(' ');
}

function pushStepOnce(plan, value) {
  const existing = plan.find((entry) => entry.id === value.id);
  if (!existing) plan.push({ ...value });
  else if (
    existing.command !== value.command ||
    existing.kind !== value.kind ||
    JSON.stringify(existing.args) !== JSON.stringify(value.args)
  ) {
    throw new Error(`Conflicting validation step identity: ${value.id}`);
  }
}

function pushSteps(plan, values) {
  values.forEach((value) => pushStepOnce(plan, value));
}

module.exports = { step, testStep, normalizeChangedFiles, commandLabel, pushStepOnce, pushSteps };
