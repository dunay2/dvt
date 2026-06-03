import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf8');
}

describe('Outbox shard assignment architecture', () => {
  it('keeps shard assignment owned by delivery and semantically tenant-aware', () => {
    const policy = readRepoFile('packages/@dvt/delivery/src/outboxShardAssignment.ts');

    expect(policy).toContain('Owned concern: assign persisted outbox shards');
    expect(policy).toContain('OutboxShardAssignmentKey');
    expect(policy).toContain('buildOutboxStreamOrderingKey');
    expect(policy).toContain('tenantId');
    expect(policy).toContain('runId');
    expect(policy).not.toContain('update(runId');
  });

  it('prevents engine from re-implementing the hash policy', () => {
    const engineFacade = readRepoFile('packages/@dvt/engine/src/state/outboxSharding.ts');

    expect(engineFacade).toContain('Owned concern: expose engine-local outbox sharding facade');
    expect(engineFacade).toContain('@dvt/delivery');
    expect(engineFacade).toContain('function resolveOutboxShardId');
    expect(engineFacade).toContain('function buildOutboxStreamOrderingKey');
    expect(engineFacade).toContain('return resolveDeliveryOutboxShardId');
    expect(engineFacade).toContain('return buildDeliveryOutboxStreamOrderingKey');
    expect(engineFacade).not.toMatch(/export\s*\{[\s\S]*\}\s*from\s+['"]@dvt\/delivery['"]/);
    expect(engineFacade).not.toContain("from 'node:crypto'");
    expect(engineFacade).not.toContain('createHash');
  });

  it('keeps PostgreSQL enqueue SQL tenant-affine instead of run-only', () => {
    const postgresStore = readRepoFile('packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts');

    expect(postgresStore).toContain('length($2::text)');
    expect(postgresStore).toContain('left(md5(');
    expect(postgresStore).not.toContain('left(md5($3), 16)');
  });

  it('keeps ADR, runbook, and component docs aligned with tenant-aware sharding', () => {
    const adr = readRepoFile('docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md');
    const runbook = readRepoFile('docs/runbooks/outbox-worker-g5.md');
    const component = readRepoFile(
      'docs/architecture/components/outbox-worker/tenant-aware-outbox-sharding-component.md'
    );

    expect(adr).toContain('tenant-affine');
    expect(runbook).toContain('tenant-aware shard assignment');
    expect(component).toContain('Tenant-Aware Outbox Sharding Component');
    expect(component).toContain('## Engine Compatibility Facade');
    expect(`${adr}\n${runbook}\n${component}`).not.toContain('stableHash64(runId) % shardCount');
  });
});
