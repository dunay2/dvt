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

module.exports = {
  assert,
  runPlanningDbOperateCli,
  ...operate,
};
