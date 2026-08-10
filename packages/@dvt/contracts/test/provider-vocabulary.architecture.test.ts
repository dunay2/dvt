/**
 * Owned concern: enforce the hard-cut provider vocabulary for active runtime
 * contracts.
 */
import { execFileSync } from 'node:child_process';
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
];

const normalizeWhitespace = (source: string): string => source.replace(/\s+/gu, ' ').trim();

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

  it('keeps repository documentation entry points on current, resolvable routes', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    const trackedPaths = new Set(
      execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
        .split('\0')
        .filter(Boolean)
    );

    expect(readme).not.toContain('docs/architecture/engine/');
    expect(readme).not.toContain('IWorkflowEngine.v2.0.md');
    expect(readme).not.toContain('ExecutionSemantics.v2.0.md');
    expect(readme).not.toContain('Agent Lane YAMLs');
    expect(readme).not.toMatch(/\[Conductor\]\([^)]+ConductorAdapter[^)]*\)/u);
    expect(readme).toContain('Documentation generation is explicit and on demand');

    const publishCommandIndex = readme.indexOf('pnpm docs:publish');
    expect(publishCommandIndex).toBeGreaterThan(-1);
    expect(publishCommandIndex).toBeLessThan(readme.indexOf('pnpm docs:serve'));
    expect(publishCommandIndex).toBeLessThan(readme.indexOf('pnpm docs:build'));

    for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
      const target = match[1]?.split('#', 1)[0];
      if (!target || /^(?:https?:|mailto:)/u.test(target)) continue;

      const normalizedTarget = target.replace(/^\.\//u, '').replaceAll('\\', '/');
      const isTracked = normalizedTarget.endsWith('/')
        ? [...trackedPaths].some((trackedPath) => trackedPath.startsWith(normalizedTarget))
        : trackedPaths.has(normalizedTarget);

      expect(isTracked, `README link must resolve in a clean Git checkout: ${target}`).toBe(true);
    }
  });

  it('distinguishes implemented Temporal support from conditional future providers', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    const executionModel = readFileSync(
      join(REPO_ROOT, 'docs/adr/ADR-0003-execution-model.md'),
      'utf8'
    );
    const adapterEquivalence = readFileSync(
      join(REPO_ROOT, 'docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md'),
      'utf8'
    );
    const workflowManual = readFileSync(
      join(REPO_ROOT, 'docs/guides/workflow-engine-user-manual.v1.md'),
      'utf8'
    );
    const stepKindGuide = readFileSync(
      join(REPO_ROOT, 'docs/guides/how-to-add-step-kind-20260406.md'),
      'utf8'
    );
    const compileCatalogManual = readFileSync(
      join(REPO_ROOT, 'docs/guides/plan-compile-catalog-extension-technical-manual-20260417.md'),
      'utf8'
    );

    expect(normalizeWhitespace(readme)).toContain(
      'Temporal is the only implemented workflow provider'
    );
    expect(normalizeWhitespace(readme)).toContain('Future workflow providers require an ADR');

    expect(executionModel).toContain('## Current Applicability');
    expect(normalizeWhitespace(executionModel)).toContain(
      'Current production composition supports Temporal only'
    );
    expect(executionModel).toContain('DVT+ will maintain **execution semantics sovereignty**');

    expect(adapterEquivalence).toContain('## Current Applicability');
    expect(normalizeWhitespace(adapterEquivalence)).toContain(
      'No cross-provider conformance claim is currently delivered'
    );
    expect(adapterEquivalence).toContain('**state-equivalent**, no execution-equivalent');

    expect(workflowManual).not.toContain('Temporal/Conductor/runtime backend');
    expect(stepKindGuide).not.toContain('`temporal`, `conductor`, or another supported');
    expect(compileCatalogManual).not.toMatch(/`temporal`,\s*`conductor`/u);

    for (const source of [workflowManual, stepKindGuide, compileCatalogManual]) {
      expect(normalizeWhitespace(source)).toContain(
        'Temporal is the only implemented workflow provider'
      );
      expect(normalizeWhitespace(source)).toContain('future provider');
    }
  });
});
