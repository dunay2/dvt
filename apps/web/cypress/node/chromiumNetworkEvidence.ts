/** Owned concern: retain private observations and reconcile safe evidence at native completion. */
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
  projectChromiumNetworkCapture,
  projectChromiumProcessLog,
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
type FailurePhase = (typeof failurePhases)[number];
type FailureCode = (typeof failureCodes)[number];
export type ChromiumLifecycleFailure = Readonly<{ phase: FailurePhase; code: FailureCode }>;

export class ChromiumDiagnosticsError extends Error {
  constructor(readonly failures: readonly ChromiumLifecycleFailure[]) {
    super('Chromium network diagnostics failed');
  }
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
  return [{ phase, code }];
}

export function publishChromiumLifecycleFailures(
  workspaceRoot: string,
  failures: readonly ChromiumLifecycleFailure[]
): void {
  const records = failures.slice(0, 16).map(({ phase, code }) => {
    if (!failurePhases.includes(phase) || !failureCodes.includes(code))
      throw new Error('Invalid Chromium lifecycle failure');
    return { phase, code };
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
