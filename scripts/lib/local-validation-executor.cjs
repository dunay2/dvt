/**
 * Owned concern: bounded execution and retirement of an already selected validation plan.
 * @baseline RunChangedSliceVerification: interrupted execution cannot authorize success.
 * @decision Await the shared process owner under inherited absolute deadlines.
 * @consequence Scope selection and success stamps stay with their own callers.
 * @version 1.0.0
 */
const path = require('node:path');
const {
  spawnLiveProofProcess,
  terminateLiveProofProcess,
  createProcessLifetime,
  VALIDATION_DEADLINE_ENV,
} = require('../live-proof-process.cjs');
const { createGitRepositoryEnvironment } = require('./git-repository-environment.cjs');
const { commandLabel } = require('./local-validation-plan-values.cjs');
const repoRoot = path.resolve(__dirname, '../..');

function validationLimit(value, fallback) {
  const limit = value ?? fallback;
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 2_147_483_647) {
    throw new Error(
      'Validation execution limit must be a positive bounded integer in milliseconds'
    );
  }
  return limit;
}

async function executeCommandPlan(plan, options = {}) {
  const stepTimeoutMs = validationLimit(options.stepTimeoutMs, 120 * 60_000);
  const totalTimeoutMs = validationLimit(options.totalTimeoutMs, 120 * 60_000);
  const cleanupTimeoutMs = validationLimit(options.cleanupTimeoutMs, 60_000);
  const forceTimeoutMs = validationLimit(options.forceTimeoutMs, 5_000);
  const env = { ...(options.env ?? process.env) };
  const lifetime = createProcessLifetime({
    env,
    deadline: Date.now() + totalTimeoutMs,
    signal: options.signal,
    processRef: options.processRef,
  });
  const spawnProcess = options.spawnProcess ?? spawnLiveProofProcess;
  const terminateProcess = options.terminateProcess ?? terminateLiveProofProcess;
  const log = options.log ?? console.log;
  const fail = (error) => {
    if (options.throwOnError) throw error;
    log(`[${options.label || 'validation'}] ${error.message}`);
    return Number.isInteger(error.exitCode) && error.exitCode > 0 && error.exitCode <= 255
      ? error.exitCode
      : 1;
  };
  try {
    for (const nextStep of plan) {
      lifetime.checkDeadline();
      if (lifetime.signal.aborted) return fail(lifetime.signal.reason);
      const startedAt = Date.now();
      const stepLifetime = createProcessLifetime({
        env,
        deadline: Math.min(lifetime.deadline, startedAt + stepTimeoutMs),
        signal: lifetime.signal,
        processRef: options.processRef,
      });
      const childEnv = { ...env, [VALIDATION_DEADLINE_ENV]: String(stepLifetime.deadline) };
      let handle;
      let result;
      let failure;
      let cleanupFailure;
      let forced = false;
      let onAbort;
      log(`[${options.label || 'validation'}] ${commandLabel(nextStep)}`);
      try {
        stepLifetime.signal.throwIfAborted();
        handle = spawnProcess(
          nextStep.id,
          nextStep.command,
          nextStep.args || [],
          {
            cwd: options.repoRootPath || repoRoot,
            shell: options.shell ?? true,
            stdio: options.stdio ?? 'inherit',
            env: nextStep.kind === 'test' ? createGitRepositoryEnvironment(childEnv) : childEnv,
          },
          { spawn: options.spawn, platform: options.platform }
        );
        const interrupted = new Promise((_, reject) => {
          onAbort = () => reject(stepLifetime.signal.reason);
          stepLifetime.signal.addEventListener('abort', onAbort, { once: true });
          if (stepLifetime.signal.aborted) onAbort();
        });
        result = await Promise.race([handle.completion, interrupted]);
        stepLifetime.checkDeadline();
        stepLifetime.signal.throwIfAborted();
        if (result.code !== 0 || result.signal != null) {
          throw Object.assign(
            new Error(
              `${commandLabel(nextStep)} failed: exit ${result.code}, signal ${result.signal}`
            ),
            {
              exitCode: result.code || 1,
            }
          );
        }
      } catch (error) {
        failure = error;
      } finally {
        stepLifetime.signal.removeEventListener('abort', onAbort);
        if (handle) {
          try {
            await terminateProcess(handle, {
              platform: options.platform,
              gracefulTimeoutMs: failure ? cleanupTimeoutMs : 5_000,
              cooperativeTimeoutMs: failure ? cleanupTimeoutMs : 0,
              forceTimeoutMs,
              deadline: Date.now() + (failure ? cleanupTimeoutMs : 5_000) + forceTimeoutMs,
              onForcedTermination: () => {
                forced = true;
              },
            });
          } catch (error) {
            cleanupFailure = error;
          }
        }
        stepLifetime.checkDeadline();
        if (stepLifetime.signal.aborted) failure ??= stepLifetime.signal.reason;
        stepLifetime.dispose();
      }
      if (cleanupFailure) {
        failure = failure
          ? Object.assign(
              new AggregateError(
                [failure, cleanupFailure],
                `Validation failed (${failure.message}); owned-process cleanup failed (${cleanupFailure.message})`
              ),
              { exitCode: failure.exitCode ?? 1 }
            )
          : cleanupFailure;
      }
      if (forced)
        failure ??= new Error(
          'Owned process required forced termination; resource cleanup is unconfirmed'
        );
      const outcome = failure
        ? failure.exitCode === 124
          ? 'timed-out'
          : lifetime.signal.aborted
            ? 'cancelled'
            : 'failed'
        : 'passed';
      const receipt = {
        id: nextStep.id,
        outcome,
        durationMs: Date.now() - startedAt,
        code: result?.code ?? null,
        signal: result?.signal ?? null,
        cleanupOutcome: !handle
          ? 'not-started'
          : cleanupFailure
            ? 'failed'
            : forced
              ? 'forced-unconfirmed'
              : 'process-exited',
      };
      log(`[${options.label || 'validation'}] result ${JSON.stringify(receipt)}`);
      options.onStepResult?.(receipt);
      if (failure) return fail(failure);
    }
    lifetime.checkDeadline();
    return lifetime.signal.aborted ? fail(lifetime.signal.reason) : 0;
  } finally {
    lifetime.dispose();
  }
}

module.exports = { executeCommandPlan };
