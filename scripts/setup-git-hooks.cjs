const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const gitEntry = path.join(repoRoot, '.git');

if (!existsSync(gitEntry)) {
  process.exit(0);
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.husky'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.error) {
  if (result.error.code === 'ENOENT') {
    process.exit(0);
  }

  throw result.error;
}

process.exit(result.status ?? 0);
