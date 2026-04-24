/**
 * Owned concern: verify the AR-C3 admission-telemetry cluster keeps semantic
 * denial language and bounded metric labels, not only wiring shape.
 */
import { describe, expect, it } from 'vitest';

import { START_RUN_ADMISSION_OBSERVABILITY_COMPONENT } from './applicationArchitectureAst.support.js';

const { artifacts } = START_RUN_ADMISSION_OBSERVABILITY_COMPONENT;

describe('Start-run admission telemetry architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    expect(artifacts.componentGuide.exists()).toBe(true);

    const docText = artifacts.componentGuide.readText();
    for (const section of [
      '## Owned concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component map',
    ]) {
      expect(docText).toContain(section);
    }

    expect(docText).toContain('```mermaid');
    expect(docText).toContain('AdmissionTelemetry.ts');
    expect(docText).toContain('IBackpressureCapacityTelemetry.ts');
    expect(docText).toContain('startRunAdmissionDecisions.ts');
    expect(docText).toContain('ObservabilityAdmissionTelemetry.ts');
    expect(docText).toContain('ObservabilityBackpressureCapacityTelemetry.ts');
  });

  it('states owned-concern docblocks on the component modules', () => {
    for (const artifact of [
      artifacts.admissionTelemetryPort,
      artifacts.backpressureCapacityTelemetryPort,
      artifacts.noopAdmissionTelemetry,
      artifacts.decisions,
      artifacts.decisionTelemetry,
      artifacts.backpressureTelemetry,
      artifacts.metricCatalog,
    ]) {
      expect(artifact.hasOwnedConcernDocblock()).toBe(true);
    }
  });

  it('keeps execution-capacity denial in canonical system telemetry decisions', () => {
    const decisionsText = artifacts.decisions.readText();

    expect(decisionsText).toContain('ADMISSION_TELEMETRY_DECISION.rejectSystem');
    expect(decisionsText).toContain('ADMISSION_TELEMETRY_DECISION.wouldRejectSystem');
    expect(decisionsText).toContain('START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted');
    expect(decisionsText).toContain('START_RUN_BACKPRESSURE_CODE.executorUnavailable');
    expect(decisionsText).toContain('START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable');

    expect(decisionsText).not.toContain('reject_capacity');
    expect(decisionsText).not.toContain('would_reject_capacity');
    expect(decisionsText).not.toContain('decision: ADMISSION_TELEMETRY_DECISION.rejectTenant');
  });

  it('keeps decision metrics bounded to mode/decision/code and moves identity to logs only', () => {
    const decisionTelemetryText = artifacts.decisionTelemetry.readText();
    const backpressureTelemetryText = artifacts.backpressureTelemetry.readText();

    expect(decisionTelemetryText).toMatch(
      /decisionTotal\)\s*\.add\(1,\s*\{\s*mode: input\.mode,\s*decision: input\.decision\s*\}\)/s
    );
    expect(decisionTelemetryText).toMatch(
      /rejectionTotal\)\s*\.add\(1,\s*\{\s*mode: input\.mode,\s*decision: input\.decision,\s*code: input\.code\s*\}\)/s
    );
    expect(decisionTelemetryText).toContain('tenantId: input.tenantId');
    expect(decisionTelemetryText).toContain('runId: input.runId');
    expect(decisionTelemetryText).not.toMatch(/decisionTotal\)\s*\.add\(1,\s*\{[^}]*tenantId/s);
    expect(decisionTelemetryText).not.toMatch(/rejectionTotal\)\s*\.add\(1,\s*\{[^}]*tenantId/s);
    expect(backpressureTelemetryText).toContain('const labels = { source: snapshot.source }');
    expect(backpressureTelemetryText).not.toContain('tenantId: snapshot.tenantId');
  });

  it('keeps one shared telemetry namespace for admission decision and backlog gauges', () => {
    const metricCatalogText = artifacts.metricCatalog.readText();
    expect(metricCatalogText).toContain("decisionTotal: 'dvt.admission.decision_total'");
    expect(metricCatalogText).toContain("rejectionTotal: 'dvt.admission.rejection_total'");
    expect(metricCatalogText).toContain(
      "pendingEventsGauge: 'dvt.admission.pending_events_per_tenant'"
    );
    expect(metricCatalogText).toContain(
      "outboxOldestAgeGauge: 'dvt.admission.outbox_oldest_age_ms'"
    );
  });
});
