import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(currentFile, '../../../../../..');

const readRepoFile = (path: string): string => readFileSync(resolve(repoRoot, path), 'utf8');

const semanticSurfaces = [
  'apps/api/src/application/ports/StartRunSlaTelemetry.ts',
  'apps/api/src/application/services/slaTiming.ts',
  'apps/api/src/application/services/startRunAuthorizedFacade.ts',
  'apps/api/src/application/services/PlannerBackedStartRunUseCase.ts',
  'apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts',
  'apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts',
  'apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts',
  'apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts',
  'apps/outbox-worker/src/ops/monitor/OutboxDeliveryTelemetry.ts',
  'apps/outbox-worker/src/ops/monitor/model.ts',
  'apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts',
  'docs/architecture/components/engine/ops/ar-c2-prometheus-sla-component.md',
  'docs/architecture/components/engine/ops/ar-c2-prometheus-sla-user-stories.md',
  'docs/architecture/components/engine/ops/observability.md',
  'docs/architecture/components/engine/ops/runbooks/incident-response.md',
  'docs/runbooks/api-runtime-sla-canonical-20260404.md',
  'docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md',
  'docs/runbooks/ar-c2-evidence-generated-latest.md',
] as const;

const currentPrometheusMetricNames = [
  'dvt_api_run_start_latency_seconds',
  'dvt_api_plan_compile_latency_seconds',
  'dvt_delivery_event_delivery_latency_seconds',
] as const;

const legacyPrometheusMetricNames = [
  'dvt.api.run_start.latency_ms',
  'dvt.api.plan_compile.latency_ms',
  'dvt_api_run_start_latency_ms',
  'dvt_api_plan_compile_latency_ms',
  'dvt_delivery_event_delivery_latency_ms',
] as const;

const identifierLabelNames = [
  'tenantId',
  'tenant_id',
  'runId',
  'run_id',
  'planId',
  'plan_id',
  'workspaceId',
  'workspace_id',
  'eventId',
  'event_id',
] as const;

describe('AR-C2 Prometheus SLA semantic contract', () => {
  it('uses only current-version seconds latency metric names across code and docs', () => {
    const combined = semanticSurfaces.map(readRepoFile).join('\n');

    for (const metricName of currentPrometheusMetricNames) {
      expect(combined, `${metricName} must be documented or emitted`).toContain(metricName);
    }

    for (const legacyName of legacyPrometheusMetricNames) {
      expect(combined, `${legacyName} must not remain in current AR-C2 surfaces`).not.toContain(
        legacyName
      );
    }
  });

  it('documents module owned concerns for the AR-C2 telemetry boundary', () => {
    const ownedConcernModules = [
      'apps/api/src/application/ports/StartRunSlaTelemetry.ts',
      'apps/api/src/application/services/slaTiming.ts',
      'apps/api/src/infrastructure/telemetry/startRunSlaMetrics.ts',
      'apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts',
      'apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts',
      'apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts',
      'apps/outbox-worker/src/ops/monitor/OutboxDeliveryTelemetry.ts',
      'apps/outbox-worker/src/ops/monitor/model.ts',
      'apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts',
    ] as const;

    for (const modulePath of ownedConcernModules) {
      expect(readRepoFile(modulePath).slice(0, 240), modulePath).toContain('Owned concern:');
    }
  });

  it('keeps AR-C2 Prometheus labels bounded', () => {
    const telemetryCode = [
      'apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.ts',
      'apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts',
      'apps/outbox-worker/src/ops/monitor/OutboxDeliveryTelemetry.ts',
      'apps/outbox-worker/src/ops/monitor/renderOutboxWorkerMetrics.ts',
    ]
      .map(readRepoFile)
      .join('\n');

    const metricObservationBlocks =
      telemetryCode.match(/\.(?:record|add)\([^;]*?\{[^}]*?\}/gs) ?? [];

    for (const block of metricObservationBlocks) {
      for (const labelName of identifierLabelNames) {
        expect(block, `${labelName} must not be an exported AR-C2 metric label`).not.toMatch(
          new RegExp(String.raw`\b${labelName}\b`)
        );
      }
    }
  });
});
