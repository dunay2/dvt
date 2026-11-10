/** Owns process lifetime and cooperative deadlines shared by validation and native proofs. */
const { spawn } = require('node:child_process');

const VALIDATION_DEADLINE_ENV = 'DVT_VALIDATION_DEADLINE_MS';

function readValidationDeadline(env = process.env) {
  const raw = env[VALIDATION_DEADLINE_ENV];
  if (raw === undefined) return undefined;
  if (!/^\d+$/u.test(String(raw)) || !Number.isSafeInteger(Number(raw)) || Number(raw) <= 0) {
    throw new Error('Validation deadline must be a positive integer epoch timestamp');
  }
  return Number(raw);
}

/** Cooperate on the same deadline even where OS termination cannot run finally blocks. */
function createProcessLifetime(options = {}) {
  const inherited = readValidationDeadline(options.env ?? process.env);
  const deadline = Math.min(options.deadline ?? Infinity, inherited ?? Infinity);
  if (deadline !== Infinity && (!Number.isSafeInteger(deadline) || deadline <= 0)) {
    throw new Error('Process deadline must be a positive integer epoch timestamp');
  }
  const remaining = deadline - Date.now();
  if (deadline !== Infinity && remaining > 2_147_483_647) {
    throw new Error('Process deadline exceeds the supported timer range');
  }
  const controller = new AbortController();
  const processRef = options.processRef ?? process;
  const interrupt = (message, exitCode) =>
    controller.abort(Object.assign(new Error(message), { exitCode }));
  const onSigint = () => interrupt('Process interrupted by SIGINT', 130);
  const onSigterm = () => interrupt('Process interrupted by SIGTERM', 143);
  const onAbort = () =>
    controller.abort(
      options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error('Process interrupted by caller')
    );
  const checkDeadline = () => {
    if (deadline !== Infinity && Date.now() >= deadline) {
      interrupt('Process execution deadline exceeded', 124);
    }
  };
  let timer;
  processRef.on('SIGINT', onSigint);
  processRef.on('SIGTERM', onSigterm);
  if (options.signal?.aborted) onAbort();
  else options.signal?.addEventListener('abort', onAbort, { once: true });
  if (deadline !== Infinity) {
    if (remaining <= 0) checkDeadline();
    else timer = setTimeout(checkDeadline, remaining);
  }
  return {
    deadline,
    signal: controller.signal,
    checkDeadline,
    dispose() {
      clearTimeout(timer);
      processRef.off('SIGINT', onSigint);
      processRef.off('SIGTERM', onSigterm);
      options.signal?.removeEventListener('abort', onAbort);
    },
  };
}

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
    const cooperativeTimeoutMs = options.cooperativeTimeoutMs ?? 0;
    if (
      cooperativeTimeoutMs > 0 &&
      (await waitUntil(
        exited,
        Math.min(Date.now() + cooperativeTimeoutMs, options.deadline ?? Infinity)
      ))
    )
      return;
    options.onForcedTermination?.();
    const deadline = Math.min(Date.now() + forceTimeoutMs, options.deadline ?? Infinity);
    await new Promise((resolve, reject) => {
      const killer = (options.spawn ?? spawn)('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      const timeout = setTimeout(
        () => {
          killer.kill();
          reject(new Error(`taskkill timed out for ${name}`));
        },
        Math.max(0, deadline - Date.now())
      );
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
    if (!exited() && !(await waitUntil(exited, deadline))) {
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
    if (signal === 'SIGKILL') {
      options.onForcedTermination?.();
      deadline = Math.min(Date.now() + timeoutMs, options.deadline ?? Infinity);
    }
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

module.exports = {
  spawnLiveProofProcess,
  terminateLiveProofProcess,
  createProcessLifetime,
  readValidationDeadline,
  VALIDATION_DEADLINE_ENV,
};
