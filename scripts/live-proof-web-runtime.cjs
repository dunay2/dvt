/**
 * Owned concern: start one compiled Web client for a real-provider proof.
 * @baseline GH-3656: mutable development assets interrupted otherwise live journeys.
 * @decision Reuse build:e2e, the owned process launcher and readiness port.
 * @consequence Build failure stays red; preview serves a stable, scoped client.
 * @version 1.0.0
 */
async function startCompiledLiveProofWeb(options, processHandles, dependencies) {
  const { spawnProcess, waitForUrlOrProcessExit } = dependencies;
  const build = spawnProcess(
    'web-build-proof',
    ['--filter', '@dvt/web', 'run', 'build:e2e'],
    options.environment
  );
  processHandles.push(build);
  const result = await build.completion;
  if (result.code !== 0 || result.signal != null) {
    throw new Error(`Web proof build failed: exit ${result.code}, signal ${result.signal}`);
  }

  const preview = spawnProcess(
    'web-live-proof',
    [
      '--filter',
      '@dvt/web',
      'exec',
      'vite',
      'preview',
      '--mode',
      'e2e',
      '--host',
      options.host,
      '--port',
      String(options.port),
      '--strictPort',
    ],
    options.environment
  );
  processHandles.push(preview);
  await waitForUrlOrProcessExit(
    `http://127.0.0.1:${options.port}/`,
    (response) => response.statusCode === 200,
    options.timeout,
    options.interval,
    'Compiled Web preview',
    preview
  );
  return preview;
}

module.exports = { startCompiledLiveProofWeb };
