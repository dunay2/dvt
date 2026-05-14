/**
 * @file packages/@dvt/temporal-dbt-plugin/src/dbtCliFailures.ts
 * @ownedConcern Classify DBT CLI and bundle failures into stable step results
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Keep DBT process failure mapping separate from runner orchestration
 * @consequence The DBT runner can remain a thin coordinator while preserving stable failure codes
 * @version 1.0.0
 */
import type { StepResult } from '@dvt/adapter-temporal';

interface DbtCliProcessError extends Error {
  readonly code?: unknown;
  readonly stdout: string;
  readonly stderr: string;
}

export function buildFailedStepResult(
  stepId: string,
  failureReason: string,
  error?: string
): StepResult {
  return {
    stepId,
    status: 'FAILED',
    failureReason,
    ...(error === undefined ? {} : { error }),
  };
}

export function classifyDbtCliFailure(error: unknown): string {
  if (isMissingBinaryError(error)) {
    return 'DBT_CLI_NOT_FOUND';
  }

  if (isNonZeroExitError(error)) {
    return 'DBT_CLI_EXIT_NON_ZERO';
  }

  const message = toErrorMessage(error);
  if (message === 'DBT_PROJECT_DIRECTORY_NOT_FOUND') {
    return message;
  }

  if (message.startsWith('DBT_CLI_STEP_KIND_UNSUPPORTED:')) {
    return message;
  }

  return 'DBT_CLI_EXECUTION_FAILED';
}

export function toDbtCliFailureMessage(error: unknown): string {
  if (isExecFileErrorWithOutput(error)) {
    const stderr = error.stderr.trim();
    if (stderr.length > 0) {
      return stderr;
    }

    const stdout = error.stdout.trim();
    if (stdout.length > 0) {
      return stdout;
    }
  }

  return toErrorMessage(error);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Unknown dbt plugin error';
}

function isMissingBinaryError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (readErrorCode(error) === 'ENOENT' || error.message.includes('ENOENT'))
  );
}

function isNonZeroExitError(error: unknown): error is DbtCliProcessError {
  return isExecFileErrorWithOutput(error) && readErrorCode(error) !== 'ENOENT';
}

function isExecFileErrorWithOutput(error: unknown): error is DbtCliProcessError {
  return (
    error instanceof Error &&
    'stdout' in error &&
    'stderr' in error &&
    typeof (error as { stdout?: unknown }).stdout === 'string' &&
    typeof (error as { stderr?: unknown }).stderr === 'string'
  );
}

function readErrorCode(error: Error): unknown {
  return (error as Error & { code?: unknown }).code;
}
