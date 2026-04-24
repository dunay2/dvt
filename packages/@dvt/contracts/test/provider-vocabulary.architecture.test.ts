/**
 * Owned concern: enforce the hard-cut provider vocabulary for active runtime
 * contracts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CONTRACTS_ROOT = join(import.meta.dirname, '../src');
const DOCS_ROOT = join(import.meta.dirname, '../../../../docs/architecture/components/engine');
const ARCHITECTURE_ROOT = join(import.meta.dirname, '../../../../docs/architecture');
const REPO_ROOT = join(import.meta.dirname, '../../../..');

const activeProviderVocabularySources = [
  join(CONTRACTS_ROOT, 'types/contracts.ts'),
  join(CONTRACTS_ROOT, 'schema-packs/common.ts'),
  join(CONTRACTS_ROOT, 'contracts/engine/RunExecutionContext.v1.ts'),
  join(CONTRACTS_ROOT, 'step-registry/StepTypeRegistry.ts'),
  join(REPO_ROOT, 'packages/@dvt/engine/src/application/providerSelection.ts'),
  join(REPO_ROOT, 'apps/api/src/application/ports/runtime.ts'),
  join(DOCS_ROOT, 'index.md'),
  join(DOCS_ROOT, 'adapters/index.md'),
  join(DOCS_ROOT, 'architecture/c4-engine.md'),
  join(DOCS_ROOT, 'architecture/workflow-engine-subsystem-context.md'),
  join(DOCS_ROOT, 'contracts/capabilities/adapters.capabilities.json'),
  join(DOCS_ROOT, 'contracts/capabilities/validation-report.schema.json'),
  join(DOCS_ROOT, 'contracts/engine/runtime-provider-vocabulary-component.md'),
  join(DOCS_ROOT, 'contracts/engine/events/RunStarted.schema.json'),
  join(DOCS_ROOT, 'ops/slo-posture.md'),
  join(DOCS_ROOT, 'ops/metrics-catalog.md'),
  join(DOCS_ROOT, 'ops/observability.md'),
  join(DOCS_ROOT, 'ops/runbooks/incident-response.md'),
  join(DOCS_ROOT, 'ops/runbooks/severity-matrix.md'),
  join(DOCS_ROOT, 'roadmap/engine-phases.md'),
  join(ARCHITECTURE_ROOT, 'diagrams/engine-internal-components.md'),
  join(ARCHITECTURE_ROOT, 'diagrams/implementation-architecture-diagrams.md'),
  join(ARCHITECTURE_ROOT, 'system-delivery-status.md'),
];

describe('contracts: active provider vocabulary', () => {
  it('does not expose mock as a runtime provider in active contracts', () => {
    for (const sourcePath of [
      join(CONTRACTS_ROOT, 'types/contracts.ts'),
      join(CONTRACTS_ROOT, 'schema-packs/common.ts'),
      join(CONTRACTS_ROOT, 'contracts/engine/RunExecutionContext.v1.ts'),
      join(CONTRACTS_ROOT, 'step-registry/StepTypeRegistry.ts'),
      join(DOCS_ROOT, 'contracts/capabilities/adapters.capabilities.json'),
    ]) {
      expect(readFileSync(sourcePath, 'utf8')).not.toContain("'mock'");
      expect(readFileSync(sourcePath, 'utf8')).not.toContain('"mock"');
    }
  });

  it('exposes only implemented runtime providers in active contracts and composition', () => {
    for (const sourcePath of activeProviderVocabularySources) {
      expect(readFileSync(sourcePath, 'utf8')).not.toContain("'conductor'");
      expect(readFileSync(sourcePath, 'utf8')).not.toContain('"conductor"');
      expect(readFileSync(sourcePath, 'utf8')).not.toContain('Conductor');
    }
  });

  it('does not publish fake provider stubs from the engine package', () => {
    expect(
      existsSync(
        join(REPO_ROOT, 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts')
      )
    ).toBe(false);
    expect(
      existsSync(
        join(REPO_ROOT, 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts')
      )
    ).toBe(false);

    const testingBarrel = readFileSync(
      join(REPO_ROOT, 'packages/@dvt/engine/src/testing.ts'),
      'utf8'
    );

    expect(testingBarrel).not.toContain('ConductorAdapterStub');
    expect(testingBarrel).not.toContain('TemporalAdapterStub');
  });
});
