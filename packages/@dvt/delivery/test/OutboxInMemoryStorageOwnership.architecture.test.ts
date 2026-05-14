import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf8');
}

describe('in-memory outbox storage ownership', () => {
  it('keeps the in-memory outbox state machine owned by delivery', () => {
    const corePath = 'packages/@dvt/delivery/src/testing/InMemoryOutboxStorageCore.ts';
    const deliveryFacade = readRepoFile(
      'packages/@dvt/delivery/src/testing/InMemoryOutboxStorage.ts'
    );
    const engineFacade = readRepoFile('packages/@dvt/engine/src/state/InMemoryOutboxState.ts');

    expect(existsSync(join(REPO_ROOT, corePath))).toBe(true);

    expect(deliveryFacade).toContain('Owned concern: delivery testing facade');
    expect(deliveryFacade).toContain('InMemoryOutboxStorageCore');
    expect(deliveryFacade).not.toContain('private readonly pending');
    expect(deliveryFacade).not.toContain('private readonly deadLetters');
    expect(deliveryFacade).not.toContain('computeNextAttemptAtIso');

    expect(engineFacade).toContain('Owned concern: engine in-memory outbox state adapter');
    expect(engineFacade).toContain('@dvt/delivery/testing');
    expect(engineFacade).toContain('InMemoryOutboxStorageCore');
    expect(engineFacade).not.toContain('buildHeadRunSeqByStreamKey');
    expect(engineFacade).not.toContain('computeNextAttemptAtIso');
    expect(engineFacade).not.toContain('private readonly deadLetters');
  });

  it('keeps delivery application runtime dependent on the storage port rather than test stores', () => {
    const runtime = readRepoFile('packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts');
    const worker = readRepoFile('packages/@dvt/delivery/src/application/OutboxWorker.ts');

    expect(`${runtime}\n${worker}`).toContain('IOutboxStorage');
    expect(`${runtime}\n${worker}`).not.toContain('InMemoryOutboxStorage');
    expect(`${runtime}\n${worker}`).not.toContain('InMemoryOutboxStorageCore');
  });
});
