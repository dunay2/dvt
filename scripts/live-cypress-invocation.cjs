'use strict';
const path = require('node:path');

/** Owns the host-specific Cypress invocation for live protected-runtime proofs. */
function buildLiveCypressInvocation({
  platform = process.platform,
  inheritedEnv = process.env,
  webPackageRoot,
  localSpecPaths,
  containerSpecPaths,
  cypressEnv,
  cypressImage,
}) {
  if (platform === 'win32') {
    const env = { ...inheritedEnv };
    for (const [name, value] of Object.entries(cypressEnv)) {
      env[`CYPRESS_${name}`] = value;
    }
    delete env.ELECTRON_RUN_AS_NODE;
    return {
      command: 'pnpm.cmd',
      args: [
        'exec',
        'cypress',
        'run',
        '--config-file',
        'cypress.config.ts',
        '--spec',
        localSpecPaths.join(','),
      ],
      options: {
        cwd: webPackageRoot,
        stdio: 'inherit',
        env,
        shell: true,
        windowsHide: true,
      },
    };
  }

  const repoRoot = path.resolve(webPackageRoot, '../..').replaceAll('\\', '/');
  const dockerEnv = Object.entries(cypressEnv).flatMap(([name, value]) => [
    '-e',
    `CYPRESS_${name}=${value}`,
  ]);
  return {
    command: 'docker',
    args: [
      'run',
      '--rm',
      '-t',
      '-v',
      `${repoRoot}:/repo`,
      '-w',
      '/repo/apps/web',
      ...dockerEnv,
      cypressImage,
      '--project',
      '/repo/apps/web',
      '--config-file',
      '/repo/apps/web/cypress.config.ts',
      '--spec',
      containerSpecPaths.join(','),
    ],
    options: { stdio: 'inherit', windowsHide: true },
  };
}

module.exports = { buildLiveCypressInvocation };
