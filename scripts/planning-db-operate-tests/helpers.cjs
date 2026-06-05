const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const operate = require('../planning-db-operate.cjs');

function runPlanningDbOperateCli(args) {
  return spawnSync(
    process.execPath,
    [path.join(__dirname, '..', 'planning-db-operate.cjs'), ...args],
    {
      cwd: path.resolve(__dirname, '..', '..'),
      encoding: 'utf8',
    }
  );
}

const importedTask = {
  laneId: 'A',
  taskId: 'GOV-S3',
  sourcePath: 'docs/planning/state/agent-lane-a.yaml',
  sourceContentSha256: 'a'.repeat(64),
  status: 'in_progress',
  progressPct: 25,
  statusReason: 'Imported from lane file',
  evidenceRefs: [
    'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md',
  ],
};

module.exports = {
  assert,
  runPlanningDbOperateCli,
  importedTask,
  ...operate,
};
