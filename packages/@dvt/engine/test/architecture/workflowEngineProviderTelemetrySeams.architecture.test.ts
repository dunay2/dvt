import { describe, expect, it } from 'vitest';

import {
  engineArchitectureDocPath,
  expectFileExists,
  expectMarkdownSections,
  readEngineArchitectureDoc,
  readEngineSource,
  readRepoSource,
  repoPath,
} from './engineArchitectureTestSupport.js';

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
    expectFileExists(
      engineArchitectureDocPath('workflow-engine-provider-telemetry-seams-component.md')
    );
    expectFileExists(
      engineArchitectureDocPath('workflow-engine-provider-telemetry-seams-user-stories.md')
    );
    expectFileExists(
      repoPath(
        'buzon/20260512-codex-fowler-we-hx-5-provider-telemetry-seams-analysis-and-remediation.md'
      )
    );

    const guide = readEngineArchitectureDoc(
      'workflow-engine-provider-telemetry-seams-component.md'
    );
    expectMarkdownSections(guide, [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
      '## Drift Guards',
    ]);
    expect(guide).toContain('IEngineProviderResolver');
    expect(guide).toContain('StartRunTelemetryPolicy');
    expect(guide).toContain('```mermaid');

    const stories = readEngineArchitectureDoc(
      'workflow-engine-provider-telemetry-seams-user-stories.md'
    );
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

    const mailbox = readRepoSource(
      'buzon/20260512-codex-fowler-we-hx-5-provider-telemetry-seams-analysis-and-remediation.md'
    );
    expectMarkdownSections(mailbox, [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Antipatterns Detected',
      '## Repetitions To Fix',
      '## Drift To Fix',
      '## Future Lessons',
    ]);
  });
});
