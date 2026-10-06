#!/usr/bin/env node
/**
 * Owned concern: validate exact native Cypress evidence, never provision its runtime.
 * @baseline GH-3578: exit zero is not proof of complete spec execution.
 * @decision Share structured result validation between literal LIVE and controlled batch consumers.
 * @consequence Missing, duplicate, skipped or inconsistent results reject without leaking configuration.
 * @version 1.0.0
 */
const path = require('node:path');

function validateCypressProofSpecs(specs) {
  if (
    !Array.isArray(specs) ||
    specs.length === 0 ||
    new Set(specs).size !== specs.length ||
    Array.from(specs).some(
      (spec) =>
        typeof spec !== 'string' ||
        !/^cypress\/e2e\/[A-Za-z0-9._/-]+\.cy\.ts$/u.test(spec) ||
        spec.split('/').some((part) => !part || part === '.' || part === '..')
    )
  ) {
    throw new Error('Cypress proof requires a nonempty unique list of literal Cypress specs.');
  }
  return specs;
}

function hasPassingCypressStats(stats) {
  return (
    Number.isSafeInteger(stats?.tests) &&
    stats.tests > 0 &&
    stats.passes === stats.tests &&
    stats.failures === 0 &&
    stats.pending === 0 &&
    stats.skipped === 0
  );
}

function validateCypressProofRun(run, remaining) {
  if (
    typeof run?.spec?.relative !== 'string' ||
    !remaining.delete(run.spec.relative.replaceAll('\\', '/')) ||
    run.error !== null ||
    !hasPassingCypressStats(run.stats) ||
    !Array.isArray(run.tests) ||
    run.tests.length !== run.stats.tests ||
    Array.from(run.tests).some((item) => item?.state !== 'passed')
  ) {
    throw new Error('Cypress proof must contain each requested fully passed spec exactly once.');
  }
  return run.stats.tests;
}

function validateCypressProofResult(result, expectedSpecs) {
  const specs = validateCypressProofSpecs(expectedSpecs);
  const totals = {
    tests: result?.totalTests,
    passes: result?.totalPassed,
    failures: result?.totalFailed,
    pending: result?.totalPending,
    skipped: result?.totalSkipped,
  };
  if (
    !result ||
    result.status === 'failed' ||
    Object.hasOwn(result, 'failures') ||
    !hasPassingCypressStats(totals) ||
    !Array.isArray(result.runs)
  ) {
    throw new Error(
      'Cypress proof requires executed tests with no failures, pending or skipped tests.'
    );
  }
  const remaining = new Set(specs);
  const executed = result.runs.reduce(
    (count, run) => count + validateCypressProofRun(run, remaining),
    0
  );
  if (remaining.size !== 0 || executed !== totals.tests) {
    throw new Error('Cypress proof counters must match every requested spec.');
  }
  return { specs: [...specs], tests: totals.tests, passed: totals.passes };
}

async function main(argv = process.argv.slice(2), deps = {}) {
  const spec = argv[1];
  if (
    (argv.length !== 2 && argv.length !== 3) ||
    argv[0] !== '--spec' ||
    (argv.length === 3 && argv[2] !== '--headed')
  ) {
    throw new Error('Native proof requires one literal Cypress spec and optional --headed.');
  }
  validateCypressProofSpecs([spec]);
  const project = path.resolve(__dirname, '../apps/web');
  const evidenceRoot = path.resolve(__dirname, '../.dvt/evidence/selected-closure');
  const run =
    deps.run ??
    ((options) => require(require.resolve('cypress', { paths: [project] })).run(options));
  let result;
  try {
    result = await run({
      project,
      configFile: path.join(project, 'cypress.config.ts'),
      config: {
        screenshotsFolder: path.join(evidenceRoot, 'screenshots'),
        downloadsFolder: path.join(evidenceRoot, 'downloads'),
        videosFolder: path.join(evidenceRoot, 'videos'),
      },
      spec: path.resolve(project, spec),
      browser: 'chrome',
      headed: argv.includes('--headed'),
    });
  } catch {
    // Cypress configuration includes credentials; never dump its result or exception payload.
    throw new Error('Cypress native execution failed');
  }
  const evidence = validateCypressProofResult(result, [spec]);
  (deps.log ?? console.log)(
    `[selected-closure-live] Cypress proof: ${evidence.passed} passed (${spec})`
  );
  return evidence;
}

module.exports = { validateCypressProofSpecs, validateCypressProofResult, main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
