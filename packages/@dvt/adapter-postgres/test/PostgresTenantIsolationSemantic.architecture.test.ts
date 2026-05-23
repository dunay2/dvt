import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { POSTGRES_SERVICE_ACCESS } from '../src/PostgresServiceAccessCapability.js';
import {
  POSTGRES_RLS_SERVICE_ACCESS_OWNERS,
  TENANT_ISOLATION_TABLES,
} from '../src/PostgresTenantIsolationPolicy.js';

/**
 * Owned concern: keep Postgres tenant-isolation semantics aligned across the
 * RLS catalog, internal service capability owners, and component documentation.
 */
describe('Postgres tenant isolation semantic architecture', () => {
  it('keeps service access table-scoped rather than global', () => {
    const allOwners = new Set(POSTGRES_RLS_SERVICE_ACCESS_OWNERS);
    const ownersUsedByCatalog = new Set(
      TENANT_ISOLATION_TABLES.flatMap((table) => table.serviceAccessOwners)
    );
    const distinctOwnerSets = new Set(
      TENANT_ISOLATION_TABLES.map((table) => table.serviceAccessOwners.join('|'))
    );

    expect(ownersUsedByCatalog).toEqual(allOwners);
    expect(distinctOwnerSets.size).toBeGreaterThan(3);
    expect(
      TENANT_ISOLATION_TABLES.filter((table) => table.serviceAccessOwners.length === allOwners.size)
    ).toEqual([]);
  });

  it('documents public API, invariants, transitions, consumers, and diagrams', () => {
    const repoRoot = resolve(import.meta.dirname, '../../../..');
    const componentDocPath = resolve(
      repoRoot,
      'docs/architecture/components/engine/adapters/state-store/postgres/tenant-isolation-component.md'
    );
    const userStoriesPath = resolve(
      repoRoot,
      'docs/architecture/components/engine/adapters/state-store/postgres/tenant-isolation-user-stories.md'
    );
    const componentDoc = readFileSync(componentDocPath, 'utf8');
    const userStories = readFileSync(userStoriesPath, 'utf8');

    expect(componentDoc).toContain('## Public API');
    expect(componentDoc).toContain('## Invariants');
    expect(componentDoc).toContain('## Transitions');
    expect(componentDoc).toContain('## Consumers');
    expect(componentDoc).toContain('```mermaid');
    expect(componentDoc).toContain('ADR-0031');
    expect(userStories).toContain('## User Stories');

    for (const table of TENANT_ISOLATION_TABLES) {
      expect(componentDoc, `document ${table.name}`).toContain(`\`${table.name}\``);
      for (const owner of table.serviceAccessOwners) {
        expect(componentDoc, `document ${table.name} service owner ${owner}`).toContain(
          `\`${owner}\``
        );
      }
    }

    for (const capability of Object.values(POSTGRES_SERVICE_ACCESS)) {
      expect(userStories, `cover ${capability.owner}`).toContain(`\`${capability.owner}\``);
    }
  });
});
