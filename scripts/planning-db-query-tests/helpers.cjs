const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runPlanningDbQueryCli(args) {
  return spawnSync(
    process.execPath,
    [path.join(__dirname, '..', 'planning-db-query.cjs'), ...args],
    {
      cwd: path.resolve(__dirname, '..', '..'),
      encoding: 'utf8',
    }
  );
}

module.exports = {
  runPlanningDbQueryCli,
};
