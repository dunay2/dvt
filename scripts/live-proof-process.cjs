/** Owns process-tree lifetime for the selected-closure live proof. */
const { spawn } = require('node:child_process');

function spawnLiveProofProcess(name, command, args, options = {}, deps = {}) {
  const child = (deps.spawn ?? spawn)(command, args, {
    ...options,
    detached: (deps.platform ?? process.platform) !== 'win32',
    windowsHide: true,
  });
  const handle = { name, child };
  handle.completion = new Promise((resolve, reject) => {
    child.once('error', (error) => {
      handle.error = error;
      reject(error);
    });
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  // Startup readiness can fail before its caller awaits the process result.
  void handle.completion.catch(() => undefined);
  return handle;
}

async function terminateLiveProofProcess(handle, options = {}) {
  const { child, name } = handle;
  if (!Number.isSafeInteger(child.pid) || child.pid <= 0) return;
  const platform = options.platform ?? process.platform;
  const gracefulTimeoutMs = options.gracefulTimeoutMs ?? 5_000;
  const forceTimeoutMs = options.forceTimeoutMs ?? 5_000;
  const kill = options.kill ?? process.kill.bind(process);
  const exited = () => child.exitCode != null || child.signalCode != null;
  const groupAlive = () => {
    try {
      kill(-child.pid, 0);
      return true;
    } catch (error) {
      if (error.code === 'ESRCH') return false;
      throw error;
    }
  };
  const waitUntil = async (finished, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (!finished()) {
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, Math.min(50, deadline - Date.now())));
    }
    return true;
  };

  if (platform === 'win32') {
    if (exited()) return;
    await new Promise((resolve, reject) => {
      const killer = (options.spawn ?? spawn)('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      const timeout = setTimeout(() => {
        killer.kill();
        reject(new Error(`taskkill timed out for ${name}`));
      }, forceTimeoutMs);
      killer.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      killer.once('exit', (code, signal) => {
        clearTimeout(timeout);
        if (code === 0 && signal == null) resolve();
        else reject(new Error(`taskkill failed for ${name}: exit ${code}, signal ${signal}`));
      });
    });
    if (!(await waitUntil(exited, forceTimeoutMs))) {
      throw new Error(`${name} did not exit after forced termination`);
    }
    return;
  }

  if (!groupAlive()) return;
  for (const [signal, timeoutMs] of [
    ['SIGTERM', gracefulTimeoutMs],
    ['SIGKILL', forceTimeoutMs],
  ]) {
    try {
      kill(-child.pid, signal);
    } catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    if (await waitUntil(() => !groupAlive(), timeoutMs)) return;
  }
  throw new Error(`${name} did not exit after forced termination`);
}

module.exports = { spawnLiveProofProcess, terminateLiveProofProcess };
