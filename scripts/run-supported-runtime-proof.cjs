'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_RUNTIME_PROOF_PROFILE,
  validateSupportedRuntimeProofProfile,
} = require('./supported-runtime-proof/runtime-proof-profile.cjs');
const {
  executeRuntimeProofIteration,
} = require('./supported-runtime-proof/runtime-proof-scenarios.cjs');

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const profileFailures = validateSupportedRuntimeProofProfile(SUPPORTED_RUNTIME_PROOF_PROFILE);
  if (profileFailures.length > 0) {
    throw new Error(`Invalid supported runtime proof profile: ${profileFailures.join('; ')}`);
  }

  const artifact = {
    schemaVersion: 'dvt-supported-runtime-proof-report/v1',
    profile: SUPPORTED_RUNTIME_PROOF_PROFILE,
    startedAt: new Date().toISOString(),
    iterations: [],
  };

  for (let index = 0; index < options.iterations; index += 1) {
    console.log(`[supported-runtime-proof] Starting baseline ${index + 1}/${options.iterations}`);
    try {
      const result = await executeRuntimeProofIteration(SUPPORTED_RUNTIME_PROOF_PROFILE);
      artifact.iterations.push({ baseline: index + 1, ...result });
      console.log(
        `[supported-runtime-proof] Baseline ${index + 1}: ${result.evaluation.passed ? 'PASS' : `FAIL (${result.evaluation.firstFailure})`}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      artifact.iterations.push({
        baseline: index + 1,
        evaluation: { passed: false, firstFailure: 'runtime_proof_execution_failed' },
        error: message,
      });
      console.error(`[supported-runtime-proof] Baseline ${index + 1} failed: ${message}`);
    }
  }

  artifact.completedAt = new Date().toISOString();
  artifact.passed = artifact.iterations.every((iteration) => iteration.evaluation.passed);
  const outputPath = writeArtifact(options.outputPath, artifact);
  console.log(`[supported-runtime-proof] Evidence: ${outputPath}`);
  if (!artifact.passed) process.exitCode = 1;
  return artifact;
}

function parseArgs(argv) {
  let iterations = SUPPORTED_RUNTIME_PROOF_PROFILE.baselineRunCount;
  let outputPath;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--iterations') {
      iterations = Number.parseInt(argv[index + 1] ?? '', 10);
      index += 1;
      continue;
    }
    if (argument === '--output') {
      outputPath = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown supported runtime proof argument: ${argument}`);
  }
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error('--iterations must be a positive integer');
  }
  return { iterations, outputPath };
}

function writeArtifact(explicitPath, artifact) {
  const outputPath = path.resolve(
    explicitPath ??
      path.join(
        '.dvt',
        'proofs',
        `supported-runtime-${new Date().toISOString().replaceAll(':', '-')}.json`
      )
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return outputPath;
}

module.exports = { main, parseArgs, writeArtifact };

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
