/**
 * Owned concern: retain private observations and reconcile safe evidence at native completion.
 * Why: completion can fail after passing assertions, and only closed metadata may leave capture.
 * Corner: rejected projection still cleans owned raw files and blocks proof acceptance.
 */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { randomUuidV4 } from '@dvt/crypto';

import {
  ChromiumProjectionError,
  captureSyntaxReasons,
  projectChromiumNetworkCapture,
  projectChromiumProcessLog,
  type CaptureSyntaxReason,
} from './chromiumNetworkProjection';

type Observation = Readonly<{ spec: string; observedAt: string; capture: string }>;

const failurePhases = [
  'native-operation',
  'observer-stop',
  'capture-enumeration',
  'capture-read',
  'capture-projection',
  'capture-publication',
  'capture-cleanup',
] as const;
const failureCodes = ['missing', 'denied', 'invalid', 'failed'] as const;
const projectionDetails = [
  'captureSyntax',
  'logShape',
  'eventShape',
  'RangeError',
  'TypeError',
  'SyntaxError',
  'ReferenceError',
  'URIError',
  'EvalError',
  'AggregateError',
  'Error',
  'unknown',
] as const;
type FailurePhase = (typeof failurePhases)[number];
type FailureCode = (typeof failureCodes)[number];
type ProjectionFailureDetail = (typeof projectionDetails)[number];
export type ChromiumLifecycleFailure = Readonly<{
  phase: FailurePhase;
  code: FailureCode;
  detail?: ProjectionFailureDetail;
  syntaxReason?: CaptureSyntaxReason;
}>;

export class ChromiumDiagnosticsError extends Error {
  constructor(readonly failures: readonly ChromiumLifecycleFailure[]) {
    super('Chromium network diagnostics failed');
  }
}

function projectionFailureDetail(error: unknown): ProjectionFailureDetail {
  if (error instanceof ChromiumProjectionError) {
    const reason: unknown = Object.getOwnPropertyDescriptor(error, 'reason')?.value;
    if (reason === 'captureSyntax' || reason === 'logShape' || reason === 'eventShape')
      return reason;
  }
  if (error instanceof RangeError) return 'RangeError';
  if (error instanceof TypeError) return 'TypeError';
  if (error instanceof SyntaxError) return 'SyntaxError';
  if (error instanceof ReferenceError) return 'ReferenceError';
  if (error instanceof URIError) return 'URIError';
  if (error instanceof EvalError) return 'EvalError';
  if (error instanceof AggregateError) return 'AggregateError';
  return error instanceof Error ? 'Error' : 'unknown';
}

function projectionSyntaxReason(
  error: unknown,
  detail: ProjectionFailureDetail | undefined
): CaptureSyntaxReason | undefined {
  if (detail !== 'captureSyntax' || !(error instanceof ChromiumProjectionError)) return undefined;
  const reason: unknown = Object.getOwnPropertyDescriptor(error, 'syntaxReason')?.value;
  return captureSyntaxReasons.find((candidate) => candidate === reason);
}

export function classifyChromiumFailure(
  phase: FailurePhase,
  error: unknown
): readonly ChromiumLifecycleFailure[] {
  if (error instanceof ChromiumDiagnosticsError) return error.failures;
  const errno =
    error instanceof Error ? Object.getOwnPropertyDescriptor(error, 'code')?.value : undefined;
  const code: FailureCode =
    errno === 'ENOENT'
      ? 'missing'
      : errno === 'EACCES' || errno === 'EPERM'
        ? 'denied'
        : error instanceof SyntaxError
          ? 'invalid'
          : 'failed';
  const detail = phase === 'capture-projection' ? projectionFailureDetail(error) : undefined;
  const syntaxReason = projectionSyntaxReason(error, detail);
  return [
    {
      phase,
      code,
      ...(detail === undefined ? {} : { detail }),
      ...(syntaxReason === undefined ? {} : { syntaxReason }),
    },
  ];
}

export function publishChromiumLifecycleFailures(
  workspaceRoot: string,
  failures: readonly ChromiumLifecycleFailure[]
): void {
  const records = failures.slice(0, 16).map((failure) => {
    const phase: unknown = Object.getOwnPropertyDescriptor(failure, 'phase')?.value;
    const code: unknown = Object.getOwnPropertyDescriptor(failure, 'code')?.value;
    const detailDescriptor = Object.getOwnPropertyDescriptor(failure, 'detail');
    const detail: unknown = detailDescriptor?.value;
    const syntaxDescriptor = Object.getOwnPropertyDescriptor(failure, 'syntaxReason');
    const syntaxReason: unknown = syntaxDescriptor?.value;
    if (
      !failurePhases.some((value) => value === phase) ||
      !failureCodes.some((value) => value === code) ||
      (detailDescriptor !== undefined &&
        (phase !== 'capture-projection' || !projectionDetails.some((value) => value === detail))) ||
      (syntaxDescriptor !== undefined &&
        (phase !== 'capture-projection' ||
          detail !== 'captureSyntax' ||
          !captureSyntaxReasons.some((value) => value === syntaxReason)))
    )
      throw new Error('Invalid Chromium lifecycle failure');
    return {
      phase,
      code,
      ...(detailDescriptor === undefined ? {} : { detail }),
      ...(syntaxDescriptor === undefined ? {} : { syntaxReason }),
    };
  });
  const directory = resolve(workspaceRoot, '.dvt/evidence/chromium-network');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `lifecycle-${randomUuidV4()}.json`),
    JSON.stringify({ schemaVersion: 1, failures: records }),
    { flag: 'wx', mode: 0o600 }
  );
}

function validSpec(spec: string): boolean {
  return /^cypress\/e2e\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.cy\.ts$/u.test(spec);
}

function readObservation(file: string): Observation {
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (
    value === null ||
    typeof value !== 'object' ||
    !('spec' in value) ||
    typeof value.spec !== 'string' ||
    !validSpec(value.spec) ||
    !('observedAt' in value) ||
    typeof value.observedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.observedAt)) ||
    !('capture' in value) ||
    typeof value.capture !== 'string'
  )
    throw new Error('Invalid Chromium observation');
  return {
    spec: value.spec,
    observedAt: new Date(value.observedAt).toISOString(),
    capture: value.capture,
  };
}

export function stageChromiumObservation(
  browserDirectory: string,
  snapshot: Readonly<{ sequence: number; spec: string }>
): void {
  if (!validSpec(snapshot.spec)) throw new Error('Invalid diagnostic spec');
  const capture = readFileSync(join(browserDirectory, 'netlog.json'), 'utf8');
  projectChromiumNetworkCapture(capture);
  writeFileSync(
    join(browserDirectory, `failure-${snapshot.sequence}.json`),
    JSON.stringify({ spec: snapshot.spec, observedAt: new Date().toISOString(), capture }),
    { flag: 'wx', mode: 0o600 }
  );
}

export function finalizeChromiumCapture(browserDirectory: string, workspaceRoot: string): void {
  const failures: ChromiumLifecycleFailure[] = [];
  let ownedFiles: string[] = [];
  let phase: FailurePhase = 'capture-enumeration';
  try {
    const entries = readdirSync(browserDirectory, { withFileTypes: true });
    ownedFiles = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^(?:netlog\.json|process\.log|failure-[1-9]\d*\.json)$/u.test(entry.name)
      )
      .map((entry) => entry.name);
    if (ownedFiles.length !== entries.length)
      throw new ChromiumDiagnosticsError([{ phase, code: 'invalid' }]);
    phase = 'capture-read';
    const capture = readFileSync(join(browserDirectory, 'netlog.json'), 'utf8');
    const processLog = entries.some((entry) => entry.name === 'process.log')
      ? readFileSync(join(browserDirectory, 'process.log'), 'utf8')
      : undefined;
    phase = 'capture-projection';
    const report = projectChromiumNetworkCapture(capture);
    const projectedProcessLog = projectChromiumProcessLog(processLog);
    const evidence = resolve(workspaceRoot, '.dvt/evidence/chromium-network');
    const captureId = `${basename(resolve(browserDirectory, '..'))}-${basename(browserDirectory)}`;
    const finalizedAt = new Date().toISOString();
    phase = 'capture-publication';
    mkdirSync(evidence, { recursive: true });
    writeFileSync(
      join(evidence, `${captureId}.json`),
      JSON.stringify({
        ...report,
        finalizedAt,
        observationBoundary: 'native-completion',
        processLog: projectedProcessLog,
      })
    );
    for (const entry of entries.filter((entry) => entry.name.startsWith('failure-'))) {
      phase = 'capture-read';
      const observation = readObservation(join(browserDirectory, entry.name));
      phase = 'capture-projection';
      const observedReport = projectChromiumNetworkCapture(observation.capture);
      const retained = capture.startsWith(observation.capture);
      phase = 'capture-publication';
      writeFileSync(
        join(evidence, `${captureId}-${entry.name}`),
        JSON.stringify({
          ...(retained ? report : observedReport),
          spec: observation.spec,
          observedAt: observation.observedAt,
          finalizedAt,
          finalCapture: `${captureId}.json`,
          continuity: retained ? 'retained' : 'replaced',
          observationBoundary: retained ? 'native-completion' : 'after:spec',
        })
      );
    }
  } catch (error) {
    failures.push(...classifyChromiumFailure(phase, error));
  }
  for (const entry of ownedFiles) {
    try {
      unlinkSync(join(browserDirectory, entry));
    } catch (error) {
      failures.push(...classifyChromiumFailure('capture-cleanup', error));
    }
  }
  try {
    rmdirSync(browserDirectory);
  } catch (error) {
    failures.push(...classifyChromiumFailure('capture-cleanup', error));
  }
  if (failures.length > 0) throw new ChromiumDiagnosticsError(failures);
}
