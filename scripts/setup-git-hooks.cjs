const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const gitEntry = path.join(repoRoot, '.git');

if (!existsSync(gitEntry)) {
  process.exit(0);
}

function run(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, stdio: 'inherit' });
  if (result.error) {
    if (result.error.code === 'ENOENT') process.exit(0);
    throw result.error;
  }
  return result.status ?? 0;
}

run(['config', 'core.hooksPath', '.husky']);
run(['config', 'commit.template', '.gitmessage']);

process.exit(0);
