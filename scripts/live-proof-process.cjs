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
  const signalGroup = async (signal, deadline) => {
    const cancellation = new AbortController();
    const result = kill(-child.pid, signal, { deadline, signal: cancellation.signal });
    if (!result || typeof result.then !== 'function') return result;
    let timeout;
    try {
      return await Promise.race([
        result,
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => {
              cancellation.abort();
              reject(
                Object.assign(new Error(`${name} signal receipt exceeded its deadline`), {
                  code: 'PROCESS_SIGNAL_TIMEOUT',
                })
              );
            },
            Math.max(0, deadline - Date.now())
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  };
  const groupAlive = async (deadline) => {
    try {
      await signalGroup(0, deadline);
      return true;
    } catch (error) {
      if (error.code === 'ESRCH') return false;
      throw error;
    }
  };
  const waitUntil = async (finished, deadline) => {
    while (Date.now() < deadline) {
      if (await finished(deadline)) return true;
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, Math.min(50, deadline - Date.now())));
    }
    return false;
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
    if (!(await waitUntil(exited, Date.now() + forceTimeoutMs))) {
      throw new Error(`${name} did not exit after forced termination`);
    }
    return;
  }

  let deadline = Math.min(Date.now() + gracefulTimeoutMs, options.deadline ?? Infinity);
  if (!(await groupAlive(deadline))) return;
  const failures = [];
  for (const [signal, timeoutMs] of [
    ['SIGTERM', gracefulTimeoutMs],
    ['SIGKILL', forceTimeoutMs],
  ]) {
    if (signal === 'SIGKILL')
      deadline = Math.min(Date.now() + timeoutMs, options.deadline ?? Infinity);
    let gone = false;
    try {
      await signalGroup(signal, deadline);
      gone = await waitUntil(async (limit) => !(await groupAlive(limit)), deadline);
    } catch (error) {
      if (error.code === 'ESRCH') gone = true;
      else failures.push(error);
    }
    if (gone) {
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1)
        throw new AggregateError(failures, `${name} retirement had signal failures`);
      return;
    }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, `${name} retirement had signal failures`);
  throw new Error(`${name} did not exit after forced termination`);
}

module.exports = { spawnLiveProofProcess, terminateLiveProofProcess };
