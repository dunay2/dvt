import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-component.md'
);
const USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-user-stories.md'
);
const MAILBOX = join(
  REPO_ROOT,
  'buzon/20260512-codex-fowler-we-hx-5-provider-telemetry-seams-analysis-and-remediation.md'
);

describe('WorkflowEngine provider and telemetry seams architecture', () => {
  it('routes provider lookup through one semantic resolver seam', () => {
    const providerSelection = readEngineSource('application/providerSelection.ts');
    expect(providerSelection).toContain('export interface IEngineProviderResolver');
    expect(providerSelection).toContain('export class MapBackedEngineProviderResolver');
    expect(providerSelection).toContain('resolveContextTarget(');
    expect(providerSelection).toContain('resolveProviderRef(');

    for (const relativePath of [
      'application/StartRunAdmissionGuard.ts',
      'services/runControl/RunCommandService.ts',
      'services/runControl/RunSignalService.ts',
      'services/RunEnrichmentService.ts',
    ]) {
      const source = readEngineSource(relativePath);
      expect(source, relativePath).toContain('IEngineProviderResolver');
      expect(source, relativePath).not.toContain('.adapters.get(');
      expect(source, relativePath).not.toContain('getAdapterOrThrow(');
    }
  });

  it('keeps start-run start and success telemetry behind a policy seam', () => {
    const application = readEngineSource('application/StartRunApplicationService.ts');
    const telemetry = readEngineSource('services/startRun/StartRunTelemetryPolicy.ts');

    expect(telemetry).toContain('@ownedConcern Emit non-blocking start-run telemetry');
    expect(telemetry).toContain('export class StartRunTelemetryPolicy');
    expect(telemetry).toContain('recordStart(');
    expect(telemetry).toContain('recordStarted(');
    expect(telemetry).toContain('dvt.run.started_total');
    expect(telemetry).toContain('dvt.run.start.duration_ms');

    expect(application).toContain('StartRunTelemetryPolicy');
    expect(application).not.toContain("observability.metrics.counter('dvt.run.started_total'");
    expect(application).not.toContain(
      "observability.metrics.histogram('dvt.run.start.duration_ms'"
    );
    expect(application).not.toContain('function buildMetricTags(');
  });

  it('documents the WE-HX-5 component, scenarios, mailbox analysis, and drift guards', () => {
    expect(existsSync(COMPONENT_GUIDE)).toBe(true);
    expect(existsSync(USER_STORIES)).toBe(true);
    expect(existsSync(MAILBOX)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }
    expect(guide).toContain('IEngineProviderResolver');
    expect(guide).toContain('StartRunTelemetryPolicy');
    expect(guide).toContain('```mermaid');

    const stories = readFileSync(USER_STORIES, 'utf8');
    for (const expectedStory of [
      'US-WE-HX-5-001',
      'US-WE-HX-5-002',
      'US-WE-HX-5-003',
      'US-WE-HX-5-004',
      'US-WE-HX-5-005',
      'US-WE-HX-5-006',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
    ]) {
      expect(stories).toContain(expectedStory);
    }

    const mailbox = readFileSync(MAILBOX, 'utf8');
    for (const expected of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Antipatterns Detected',
      '## Repetitions To Fix',
      '## Drift To Fix',
      '## Future Lessons',
    ]) {
      expect(mailbox).toContain(expected);
    }
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}
