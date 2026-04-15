const { spawnSync } = require('node:child_process');

const defaultPgUrl = 'postgresql://dvt:dvt@localhost:5432/dvt';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function main() {
  const env = { ...process.env };
  const resolvedPgUrl = env.DVT_PG_URL ?? env.DATABASE_URL ?? defaultPgUrl;
  env.DVT_PG_URL = resolvedPgUrl;
  env.DATABASE_URL = resolvedPgUrl;

  const result = spawnSync(
    pnpmCommand,
    ['exec', 'vitest', 'run', './test/integration.postgres.time-skipping.test.ts'],
    {
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    }
  );

  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
}

main();
