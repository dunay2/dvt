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
    const contractSource = readFileSync(
      join(import.meta.dirname, '../src/engine/IRunStateStore.v1.ts'),
      'utf8'
    );
    const enginePortSource = readFileSync(
      join(import.meta.dirname, '../../engine/src/ports/IRunStateStore.ts'),
      'utf8'
    );

    for (const source of [contractSource, enginePortSource]) {
      expect(source).toContain('@ownedConcern');
      expect(source).toContain('IRunStateStoreMaintenance');
      expect(source).toContain('rebuildSnapshot(tenantId: string, runId: string)');
      expect(source).toContain('per `(tenantId, runId)`');
      expect(source).toContain('one rebuild may mutate the durable snapshot at a time');
      expect(source).toContain('serialize');
      expect(source).toContain('typed transient concurrency error');
      expect(source).not.toContain('MUST use PostgreSQL advisory locks');
      expect(source).not.toContain('MUST use pg_advisory_xact_lock');
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
