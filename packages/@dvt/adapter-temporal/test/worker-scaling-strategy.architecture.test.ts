/**
 * @ownedConcern Guard the Temporal worker scaling strategy against unsupported topology claims.
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const STRATEGY_DOC = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md'
);
const RUNBOOK_DOC = join(REPO_ROOT, 'docs/runbooks/temporal-worker-scaling-operations.md');
const WORKER_HOST_SOURCE = join(
  REPO_ROOT,
  'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts'
);
const WORKFLOW_MAPPER_SOURCE = join(
  REPO_ROOT,
  'packages/@dvt/adapter-temporal/src/WorkflowMapper.ts'
);

describe('Temporal worker scaling strategy architecture', () => {
  it('keeps the strategy closed around explicit AR-D3 production constraints', () => {
    const strategy = readFileSync(STRATEGY_DOC, 'utf8');

    expectMarkdownSections(strategy, [
      '## AR-D3 Closure Decision',
      '## Tenant Queue Assignment Policy',
      '## Capacity Model',
      '## Autoscaling Policy',
      '## Production Readiness Contract',
    ]);

    expect(strategy).toContain('many queue-local worker pools');
    expect(strategy).toContain('global shared worker pool is not implemented');
    expect(strategy).toContain('1000+ tenant provisioning automation');
    expect(strategy).toContain('KEDA Temporal Worker scaler');
    expect(strategy).not.toContain('AR-D3 remains in progress');
  });

  it('keeps the operator runbook aligned to queue-local scaling semantics', () => {
    const runbook = readFileSync(RUNBOOK_DOC, 'utf8');

    expectMarkdownSections(runbook, [
      '## Tenant Queue Assignment Policy',
      '## Capacity Model',
      '## Autoscaling Policy',
      '## Production Readiness Contract',
    ]);

    expect(runbook).toContain('TEMPORAL_TASK_QUEUE=<baseQueue>-<tenantId>');
    expect(runbook).toContain('schedule-to-start latency');
    expect(runbook).toContain('KEDA Temporal Worker scaler');
    expect(runbook).toContain('global shared pool that polls all tenant queues is not implemented');
    expect(runbook).not.toContain('Do not claim AR-D3 production scale readiness until');
  });

  it('keeps docs bound to the executable queue mapping and single-queue worker host', () => {
    const strategy = readFileSync(STRATEGY_DOC, 'utf8');
    const workerHost = readFileSync(WORKER_HOST_SOURCE, 'utf8');
    const workflowMapper = readFileSync(WORKFLOW_MAPPER_SOURCE, 'utf8');

    expect(workflowMapper).toContain('`${cfg.connection.taskQueue}-${tenantId}`');
    expect(workerHost).toContain('Worker.create({');
    expect(workerHost).toContain('taskQueue: this.config.temporalConfig.connection.taskQueue');
    expect(strategy).toContain('`toTemporalTaskQueue()`');
    expect(strategy).toContain('`TemporalWorkerHost` creates one Temporal SDK `Worker`');
  });
});

function expectMarkdownSections(markdown: string, headings: readonly string[]): void {
  for (const heading of headings) {
    expect(markdown, `markdown should contain ${heading}`).toContain(heading);
  }
}
