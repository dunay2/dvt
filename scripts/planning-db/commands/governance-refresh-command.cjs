/** Owned concern: parse governance refresh command-rail CLI input. */
const {
  allowedRunStates,
  defaultGovernanceRefreshRunIdempotencyKey,
} = require('../governance-refresh-write-rail.cjs');

function validateGovernanceRefreshRunState(value) {
  if (!allowedRunStates.has(value)) {
    throw new Error(
      `Invalid governance refresh run state "${value}". Expected: ${[...allowedRunStates].join(
        ', '
      )}.`
    );
  }

  return value;
}

function createGovernanceRefreshCommandParser(deps) {
  const {
    normalizeOptionalText,
    parseBooleanOption,
    parseFlagOptions,
    parseIntegerOption,
    requireOption,
  } = deps;

  return function parseGovernanceRefreshCommand(action, args) {
    if (action !== 'record-run') {
      throw new Error(`Unknown governance-refresh operation "${action}". Expected record-run.`);
    }

    const options = parseFlagOptions(args);
    const command = {
      kind: 'governance_refresh_run_record',
      runId: requireOption(options, 'run'),
      runState: validateGovernanceRefreshRunState(requireOption(options, 'state')),
      actor: requireOption(options, 'actor'),
      commandName: options.command || 'pnpm governance:refresh',
      sourceRef: requireOption(options, 'sourceRef'),
      sourceContentSha256: requireOption(options, 'sourceContentSha256'),
      maxPasses: parseIntegerOption(requireOption(options, 'maxPasses'), 'max-passes'),
      generationPasses: parseIntegerOption(options.generationPasses || '0', 'generation-passes'),
      stabilized: parseBooleanOption(options.stabilized, 'stabilized'),
      errorSummary: normalizeOptionalText(options.error),
      startedAt: normalizeOptionalText(options.startedAt),
      completedAt: normalizeOptionalText(options.completedAt),
      idempotencyKey: normalizeOptionalText(options.idempotencyKey),
      expectedRevision: parseIntegerOption(options.expectedRevision, 'expected-revision'),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultGovernanceRefreshRunIdempotencyKey(command),
    };
  };
}

module.exports = {
  createGovernanceRefreshCommandParser,
  validateGovernanceRefreshRunState,
};
