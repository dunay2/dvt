#!/usr/bin/env node
/* eslint-env node */
/* global console, process, __dirname, Buffer */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  parsePlanRef,
  parseRunContext,
  parseSignalRequest,
  parseEngineRunRef,
  parseRunStatusSnapshot,
  parseCanonicalEngineEvent,
  parseRunSnapshot,
  parseExecuteStepRequest,
  parseExecuteStepResult,
  ContractValidationError,
} = require('../contracts/dist/index.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLANS_DIR = path.join(REPO_ROOT, 'packages', 'engine', 'test', 'contracts', 'plans');
const RESULTS_FILE = path.join(
  REPO_ROOT,
  'packages',
  'engine',
  'test',
  'contracts',
  'results',
  'golden-paths-run.json'
);
const GLOSSARY_VALIDATOR = path.join(REPO_ROOT, 'scripts', 'validate-glossary-usage.cjs');

function collectJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort()
    .map((name) => path.join(dirPath, name));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
}

function runCheck(checkName, fn) {
  try {
    fn();
    return { ok: true, checkName };
  } catch (error) {
    const details =
      error instanceof ContractValidationError
        ? error.details.map((d) => `${d.path}: ${d.message}`).join('; ')
        : error.message;
    return {
      ok: false,
      checkName,
      error: details || 'validation failed',
    };
  }
}

function validatePlanFile(filePath) {
  const payload = readJson(filePath);
  const checks = [];

  checks.push(
    runCheck('PlanRef schema', () => {
      const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
      parsePlanRef({
        uri: `repo://${rel(filePath)}`,
        sha256: 'placeholder-sha256',
        schemaVersion: payload?.metadata?.schemaVersion,
        planId: payload?.metadata?.planId,
        planVersion: payload?.metadata?.planVersion,
        sizeBytes: bytes.length,
      });
    })
  );

  checks.push(
    runCheck('RunContext schema', () => {
      parseRunContext({
        tenantId: 'tenant-demo',
        projectId: 'project-demo',
        environmentId: 'dev',
        runId: `run-${payload?.metadata?.planId || 'unknown'}`,
        targetAdapter:
          payload?.metadata?.targetAdapter === 'any' || !payload?.metadata?.targetAdapter
            ? 'mock'
            : payload.metadata.targetAdapter,
      });
    })
  );

  checks.push(
    runCheck('SignalRequest schema', () => {
      parseSignalRequest({
        signalId: 'signal-1',
        type: 'PAUSE',
        reason: 'validation-smoke',
      });
    })
  );

  checks.push(
    runCheck('EngineRunRef schema', () => {
      parseEngineRunRef({
        provider: 'mock',
        workflowId: payload?.metadata?.planId || 'workflow',
        runId: 'run-1',
      });
    })
  );

  checks.push(
    runCheck('RunStatusSnapshot schema', () => {
      parseRunStatusSnapshot({
        runId: 'run-1',
        status: 'RUNNING',
        substatus: 'RETRYING',
      });
    })
  );

  checks.push(
    runCheck('CanonicalEngineEvent schema', () => {
      parseCanonicalEngineEvent({
        runId: 'run-1',
        runSeq: 1,
        eventId: 'event-1',
        eventType: 'RunStarted',
        eventData: {
          planId: payload?.metadata?.planId || 'unknown',
          steps: Array.isArray(payload?.steps) ? payload.steps.length : 0,
        },
        idempotencyKey: 'idem-1',
        emittedAt: new Date().toISOString(),
      });
    })
  );

  checks.push(
    runCheck('RunSnapshot schema', () => {
      parseRunSnapshot({
        runId: 'run-1',
        status: 'RUNNING',
        lastEventSeq: 1,
        steps: (Array.isArray(payload?.steps) ? payload.steps : []).map((step, index) => ({
          stepId: String(step.stepId || `s${index + 1}`),
          status: 'PENDING',
          logicalAttemptId: `attempt-${index + 1}`,
          artifacts: [],
        })),
        artifacts: [],
      });
    })
  );

  checks.push(
    runCheck('ExecuteStepRequest schema', () => {
      const firstStep = Array.isArray(payload?.steps) && payload.steps.length ? payload.steps[0] : null;
      parseExecuteStepRequest({
        tenantId: 'tenant-demo',
        planId: payload?.metadata?.planId || 'unknown',
        runId: 'run-1',
        stepId: firstStep?.stepId || 's1',
        stepType: firstStep?.kind || 'noop',
        stepData: {},
      });
    })
  );

  checks.push(
    runCheck('ExecuteStepResult schema', () => {
      const firstStep = Array.isArray(payload?.steps) && payload.steps.length ? payload.steps[0] : null;
      parseExecuteStepResult({
        runId: 'run-1',
        stepId: firstStep?.stepId || 's1',
        status: 'SUCCESS',
        output: {},
        duration: 1,
        executedAt: Date.now(),
      });
    })
  );

  const failed = checks.filter((c) => !c.ok);
  return {
    filePath,
    totalChecks: checks.length,
    failed,
    passed: checks.length - failed.length,
  };
}

function validateGoldenResultsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      exists: false,
      ok: true,
      message: 'optional file not found',
    };
  }

  try {
    const payload = readJson(filePath);

    const hasTimestamp = typeof payload.timestamp === 'string';
    const hasPaths = payload.paths && typeof payload.paths === 'object' && !Array.isArray(payload.paths);

    if (!hasTimestamp || !hasPaths) {
      return {
        filePath,
        exists: true,
        ok: false,
        message: 'expected keys: timestamp:string and paths:object',
      };
    }

    return {
      filePath,
      exists: true,
      ok: true,
      message: 'structure ok',
    };
  } catch (error) {
    return {
      filePath,
      exists: true,
      ok: false,
      message: error.message,
    };
  }
}

function main() {
  console.log('🔍 Contract validation bundle (US-1.1 / #133)\n');

  if (fs.existsSync(GLOSSARY_VALIDATOR)) {
    const glossaryRun = spawnSync(process.execPath, [GLOSSARY_VALIDATOR, '--mode', 'warn'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    if (glossaryRun.status !== 0) {
      console.error('\n❌ Glossary validation execution failed');
      process.exit(1);
    }
  }

  const planFiles = collectJsonFiles(PLANS_DIR);
  if (!planFiles.length) {
    console.error('❌ No plan fixtures found in packages/engine/test/contracts/plans');
    process.exit(1);
  }

  const planReports = planFiles.map((filePath) => validatePlanFile(filePath));
  for (const report of planReports) {
    const fileLabel = rel(report.filePath);
    if (report.failed.length === 0) {
      console.log(`✅ ${fileLabel} (${report.passed}/${report.totalChecks} checks)`);
      continue;
    }

    console.log(`❌ ${fileLabel} (${report.passed}/${report.totalChecks} checks)`);
    for (const fail of report.failed) {
      console.log(`   - ${fail.checkName}: ${fail.error}`);
    }
  }

  const goldenReport = validateGoldenResultsFile(RESULTS_FILE);
  if (goldenReport.ok) {
    const label = rel(goldenReport.filePath);
    console.log(`✅ ${label} (${goldenReport.message})`);
  } else {
    const label = rel(goldenReport.filePath);
    console.log(`❌ ${label} (${goldenReport.message})`);
  }

  const totalChecks = planReports.reduce((acc, r) => acc + r.totalChecks, 0) + (goldenReport.exists ? 1 : 0);
  const totalFailures =
    planReports.reduce((acc, r) => acc + r.failed.length, 0) + (goldenReport.ok ? 0 : 1);

  console.log('\n📊 Summary');
  console.log(`   Plan files: ${planReports.length}`);
  console.log(`   Total checks: ${totalChecks}`);
  console.log(`   Failed: ${totalFailures}`);

  if (totalFailures > 0) {
    console.error('\n❌ Contract validation failed');
    process.exit(1);
  }

  console.log('\n✅ Contract validation passed');
}

main();
