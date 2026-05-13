/**
 * Owned concern: verify the Postgres schema rollback component keeps semantic
 * ownership, public API, invariants, transitions, and online-compatibility docs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Postgres schema rollback zero-downtime component semantics', () => {
  it('states the owned concern at the top of the rollback owner modules', () => {
    expect(
      readFileSync(join(import.meta.dirname, '../src/PostgresSchemaManager.ts'), 'utf8')
    ).toMatch(
      /^\/\*\*[\s\S]*\* @ownedConcern Owns PostgreSQL schema migration catalog, rollback planning\/execution, and rollback compatibility classification for the state-store adapter\.[\s\S]*\*\//
    );
    expect(
      readFileSync(join(import.meta.dirname, '../src/PostgresStateStoreAdminAdapter.ts'), 'utf8')
    ).toMatch(
      /^\/\*\*[\s\S]*\* @ownedConcern Owns Postgres administrative schema lifecycle commands, including online-compatible rollback orchestration\.[\s\S]*\*\//
    );
  });

  it('publishes component API, invariants, transitions, consumers, and diagrams', () => {
    const componentGuidePath = join(
      import.meta.dirname,
      '../../../../docs/architecture/components/engine/adapters/state-store/postgres/schema-rollback-zero-downtime-component.md'
    );

    expect(existsSync(componentGuidePath)).toBe(true);

    const guide = readFileSync(componentGuidePath, 'utf8');

    expect(guide).toContain('# Postgres schema rollback zero-downtime component');
    expect(guide).toContain('## Public API');
    expect(guide).toContain('## Invariants');
    expect(guide).toContain('## Transitions');
    expect(guide).toContain('## Consumers');
    expect(guide).toContain('## Diagrams');
    expect(guide).toContain('```mermaid');
    expect(guide).toContain('online-compatible rollback');
    expect(guide).toContain('without setting `hasActiveClients=false`');
    expect(guide).toContain('PostgresSchemaRollbackCompatibilityPolicy');
  });

  it('publishes user stories and mailbox Fowler analysis for every rollback scenario', () => {
    const userStoriesPath = join(
      import.meta.dirname,
      '../../../../docs/architecture/components/engine/adapters/state-store/postgres/schema-rollback-zero-downtime-user-stories.md'
    );
    const mailboxReviewPath = join(
      import.meta.dirname,
      '../../../../buzon/20260513-codex-fowler-ar-d4-zero-downtime-schema-rollback-analysis.md'
    );

    expect(existsSync(userStoriesPath)).toBe(true);
    expect(existsSync(mailboxReviewPath)).toBe(true);

    const stories = readFileSync(userStoriesPath, 'utf8');
    const mailbox = readFileSync(mailboxReviewPath, 'utf8');

    expect(stories).toContain('US-ZDR-001');
    expect(stories).toContain('US-ZDR-002');
    expect(stories).toContain('US-ZDR-003');
    expect(stories).toContain('US-ZDR-004');
    expect(stories).toContain('SCHEMA_ROLLBACK_REQUIRES_OFFLINE_COMPATIBILITY');
    expect(stories).toContain('```mermaid');

    expect(mailbox).toContain('# Fowler architecture analysis - AR-D4');
    expect(mailbox).toContain('## Fowler reading');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Repetitions and drift');
    expect(mailbox).toContain('## Mature-system comparison');
  });

  it('keeps the planning proposal tied to real command/query rails and red-green cycles', () => {
    const proposalPath = join(
      import.meta.dirname,
      '../../../../docs/planning/proposals/mandatory/runtime-and-contracts/ar-d4-zero-downtime-schema-rollback-plan-20260513.md'
    );

    expect(existsSync(proposalPath)).toBe(true);

    const proposal = readFileSync(proposalPath, 'utf8');

    expect(proposal).toContain('AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK');
    expect(proposal).toContain('PostgresStateStoreSchemaRollbackCommand');
    expect(proposal).toContain('PostgresStateStoreSchemaRollbackPlan');
    expect(proposal).toContain('Red/Green cycle 1');
    expect(proposal).toContain('Red/Green cycle 2');
    expect(proposal).toContain('Red/Green cycle 3');
  });

  it('documents online-compatible rollback in package design instead of only local docs', () => {
    const design = readFileSync(
      join(import.meta.dirname, '../../../../packages/@dvt/adapter-postgres/DESIGN.md'),
      'utf8'
    );

    expect(design).toContain('online-compatible rollback');
    expect(design).toContain('SCHEMA_ROLLBACK_REQUIRES_OFFLINE_COMPATIBILITY');
    expect(design).toContain('destructive rollback plans fail closed');
  });

  it('does not route online rollback through adapter maintenance mode', () => {
    const adminSource = readFileSync(
      join(import.meta.dirname, '../src/PostgresStateStoreAdminAdapter.ts'),
      'utf8'
    );
    const rollbackMethod = adminSource.slice(adminSource.indexOf('async rollbackSchemaTo'));

    expect(rollbackMethod).toContain('PostgresSchemaRollbackCompatibilityPolicy');
    expect(rollbackMethod).toContain('assertOnlineCompatible');
    expect(rollbackMethod).not.toContain('withMaintenanceMode');
    expect(rollbackMethod).not.toContain('hasActiveClients');
    expect(rollbackMethod).not.toContain('schemaRollbackActiveClientsErrorMessage');
  });
});
