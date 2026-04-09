import path from 'node:path';
import { spawn } from 'node:child_process';

const webDir = process.cwd();
const repoRoot = path.resolve(webDir, '..', '..');
const mountPath = `${repoRoot}:/repo`;

const dockerArgs = [
  'run',
  '--rm',
  '-t',
  '-v',
  mountPath,
  '-w',
  '/repo/apps/web',
  '-e',
  'CYPRESS_baseUrl=http://host.docker.internal:4173',
  'cypress/included:13.17.0',
  '--project',
  '/repo/apps/web',
  '--config-file',
  '/repo/apps/web/cypress.config.ts',
];

const child = spawn('docker', dockerArgs, {
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

