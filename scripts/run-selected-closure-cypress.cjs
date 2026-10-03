#!/usr/bin/env node
/** Owns native Cypress execution and evidence validation, never runtime provisioning. */
const path = require('node:path');

function validateCypressProofResult(result, expectedSpec) {
  const counters = ['totalTests', 'totalPassed', 'totalFailed', 'totalPending', 'totalSkipped'];
  if (
    !result ||
    result.status === 'failed' ||
    Object.hasOwn(result, 'failures') ||
    counters.some((key) => !Number.isSafeInteger(result[key]) || result[key] < 0) ||
    result.totalTests === 0 ||
    result.totalPassed !== result.totalTests ||
    result.totalFailed !== 0 ||
    result.totalPending !== 0 ||
    result.totalSkipped !== 0 ||
    !Array.isArray(result.runs) ||
    result.runs.length !== 1
  ) {
    throw new Error(
      'Cypress proof requires executed tests with no failures, pending or skipped tests.'
    );
  }
  const run = result.runs[0];
  if (
    typeof run?.spec?.relative !== 'string' ||
    run.spec.relative.replaceAll('\\', '/') !== expectedSpec ||
    run.error !== null ||
    run.stats?.tests !== result.totalTests ||
    run.stats?.passes !== result.totalPassed ||
    run.stats?.failures !== 0 ||
    run.stats?.pending !== 0 ||
    run.stats?.skipped !== 0 ||
    !Array.isArray(run.tests) ||
    run.tests.length !== result.totalTests ||
    run.tests.some((item) => item?.state !== 'passed')
  ) {
    throw new Error('Cypress proof must contain exactly the requested fully passed spec.');
  }
  return { spec: expectedSpec, tests: result.totalTests, passed: result.totalPassed };
}

async function main(argv = process.argv.slice(2), deps = {}) {
  const spec = argv[1];
  if (
    (argv.length !== 2 && argv.length !== 3) ||
    argv[0] !== '--spec' ||
    (argv.length === 3 && argv[2] !== '--headed') ||
    typeof spec !== 'string' ||
    !/^cypress\/e2e\/[A-Za-z0-9._/-]+\.cy\.ts$/u.test(spec) ||
    spec.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('Native proof requires one literal Cypress spec and optional --headed.');
  }
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
  const evidence = validateCypressProofResult(result, spec);
  (deps.log ?? console.log)(
    `[selected-closure-live] Cypress proof: ${evidence.passed} passed (${spec})`
  );
  return evidence;
}

module.exports = { validateCypressProofResult, main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
