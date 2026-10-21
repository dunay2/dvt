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

import {
  projectChromiumNetworkCapture,
  projectChromiumProcessLog,
} from './chromiumNetworkProjection';

type Observation = Readonly<{ spec: string; observedAt: string; capture: string }>;

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
  const entries = readdirSync(browserDirectory, { withFileTypes: true });
  const ownedFiles = entries.filter(
    (entry) =>
      entry.isFile() && /^(?:netlog\.json|process\.log|failure-[1-9]\d*\.json)$/u.test(entry.name)
  );
  try {
    if (ownedFiles.length !== entries.length) throw new Error('Unexpected Chromium capture file');
    const capture = readFileSync(join(browserDirectory, 'netlog.json'), 'utf8');
    const report = projectChromiumNetworkCapture(capture);
    const evidence = resolve(workspaceRoot, '.dvt/evidence/chromium-network');
    const captureId = `${basename(resolve(browserDirectory, '..'))}-${basename(browserDirectory)}`;
    const finalizedAt = new Date().toISOString();
    mkdirSync(evidence, { recursive: true });
    writeFileSync(
      join(evidence, `${captureId}.json`),
      JSON.stringify({
        ...report,
        finalizedAt,
        observationBoundary: 'native-completion',
        processLog: projectChromiumProcessLog(
          entries.some((entry) => entry.name === 'process.log')
            ? readFileSync(join(browserDirectory, 'process.log'), 'utf8')
            : undefined
        ),
      })
    );
    for (const entry of entries.filter((entry) => entry.name.startsWith('failure-'))) {
      const observation = readObservation(join(browserDirectory, entry.name));
      const observedReport = projectChromiumNetworkCapture(observation.capture);
      const retained = capture.startsWith(observation.capture);
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
  } finally {
    for (const entry of ownedFiles) unlinkSync(join(browserDirectory, entry.name));
    rmdirSync(browserDirectory);
  }
}
