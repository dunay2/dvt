/**
 * Owned concern: keep snapshot rebuild concurrency as a portable state-store
 * maintenance contract invariant, not a PostgreSQL implementation detail.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('state-store maintenance rebuild concurrency architecture', () => {
  it('documents the component API, invariants, transitions, and consumers', () => {
    const stateStoreDocsRoot = join(
      import.meta.dirname,
      '../../../../docs/architecture/components/engine/contracts/state-store'
    );
    const componentPath = join(stateStoreDocsRoot, 'snapshot-rebuild-concurrency-component.md');
    const storiesPath = join(stateStoreDocsRoot, 'snapshot-rebuild-concurrency-user-stories.md');

    expect(existsSync(componentPath)).toBe(true);
    expect(existsSync(storiesPath)).toBe(true);

    const component = readFileSync(componentPath, 'utf8');
    for (const section of [
      '## Owned Concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Component Map',
      '## Consumers',
    ]) {
      expect(component).toContain(section);
    }
    expect(component).toContain('```mermaid');
    expect(component).toContain('per `(tenantId, runId)`');
    expect(component).toContain('typed transient concurrency error');

    const stories = readFileSync(storiesPath, 'utf8');
    for (const story of ['US-AR-A6-1', 'US-AR-A6-2', 'US-AR-A6-3', 'US-AR-A6-4', 'US-AR-A6-5']) {
      expect(stories).toContain(story);
    }
  });

  it('keeps rebuildSnapshot mutual exclusion in the live contracts', () => {
    const contractVocabularySource = readFileSync(
      join(import.meta.dirname, '../src/contracts/engine/RunStateVocabulary.v1.ts'),
      'utf8'
    );
    const enginePortSource = readFileSync(
      join(import.meta.dirname, '../../engine/src/ports/IRunStateStore.ts'),
      'utf8'
    );

    expect(contractVocabularySource).toContain('@ownedConcern');
    expect(contractVocabularySource).toMatch(/export\s+interface\s+WorkflowSnapshot\b/);
    expect(contractVocabularySource).toMatch(/export\s+type\s+EventEnvelope\b/);

    expect(enginePortSource).toContain('@ownedConcern');
    expect(enginePortSource).toMatch(/export\s+interface\s+IRunStateStoreMaintenance\b/);
    expect(enginePortSource).toMatch(
      /rebuildSnapshot\(\s*tenantId:\s*string,\s*runId:\s*string\s*\):\s*Promise<WorkflowSnapshot>;/
    );
    expect(enginePortSource).toContain('per `(tenantId, runId)`');
    expect(enginePortSource).toContain('typed transient concurrency error');
    expect(enginePortSource).not.toContain('MUST use PostgreSQL advisory locks');
    expect(enginePortSource).not.toContain('MUST use pg_advisory_xact_lock');
  });

  it('keeps engine-owned state-store behavior ports out of @dvt/contracts files and barrels', () => {
    const contractRoot = readFileSync(join(import.meta.dirname, '../src/index.ts'), 'utf8');
    const legacyRoot = readFileSync(join(import.meta.dirname, '../index.js'), 'utf8');
    const contractVocabularySource = readFileSync(
      join(import.meta.dirname, '../src/contracts/engine/RunStateVocabulary.v1.ts'),
      'utf8'
    );

    expect(existsSync(join(import.meta.dirname, '../src/engine/IRunStateStore.v1.ts'))).toBe(false);

    const forbiddenBehaviorSymbols = [
      'IRunStateStore',
      'IRunStateStoreWrite',
      'IRunStateStoreRead',
      'IRunStateStoreMaintenance',
      'RunStateCommandPort',
      'IClock',
      'IIdempotencyKeyBuilder',
    ] as const;

    for (const forbiddenSymbol of forbiddenBehaviorSymbols) {
      expect(contractVocabularySource).not.toMatch(
        new RegExp(`export\\s+(?:interface|type)\\s+${forbiddenSymbol}\\b`)
      );
      expect(contractRoot).not.toContain(forbiddenSymbol);
      expect(legacyRoot).not.toContain(forbiddenSymbol);
    }
  });

  it('keeps adapter docs aligned on portable semantics instead of lock technology', () => {
    const overview = readFileSync(
      join(
        import.meta.dirname,
        '../../../../docs/architecture/components/engine/contracts/state-store/overview.md'
      ),
      'utf8'
    );
    const componentGuide = readFileSync(
      join(
        import.meta.dirname,
        '../../../../docs/architecture/components/engine/contracts/state-store/snapshot-rebuild-concurrency-component.md'
      ),
      'utf8'
    );
    const postgresSource = readFileSync(
      join(import.meta.dirname, '../../adapter-postgres/src/PostgresRunSnapshotStore.ts'),
      'utf8'
    );

    expect(overview).toContain('snapshot rebuild');
    expect(overview).toContain('per `(tenantId, runId)`');
    expect(overview.replace(/\s+/g, ' ')).toContain(
      'serialize or fail with a typed transient concurrency error'
    );

    expect(componentGuide).toContain('PostgreSQL uses transaction-scoped advisory locks today');
    expect(componentGuide).toContain('Other adapters may use');
    expect(componentGuide).toContain('equivalent mutual exclusion semantics');

    expect(postgresSource).toContain('@ownedConcern');
    expect(postgresSource).toContain('portable state-store maintenance invariant');
  });
});
