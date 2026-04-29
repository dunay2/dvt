import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(import.meta.dirname, '../src');
const PLAN_VERSION_SOURCE = join(SRC_ROOT, 'planVersion.ts');
const VERIFY_SOURCE = join(SRC_ROOT, 'verify.ts');
const README = join(import.meta.dirname, '../README.md');
const COMPONENT_DOC = join(
  import.meta.dirname,
  '../../../../docs/architecture/components/engine/contracts/plan-verifier-admission.md'
);

describe('@dvt/plan-verifier plan-version admission architecture', () => {
  it('keeps plan verification on explicit admission instead of legacy semver compatibility', () => {
    for (const path of [PLAN_VERSION_SOURCE, VERIFY_SOURCE, README]) {
      const source = readFileSync(path, 'utf8');

      expect(source, path).toContain('admission');
      expect(source, path).not.toContain('PLAN_RUNTIME_COMPATIBILITY_MATRIX');
      expect(source, path).not.toContain('supportedMajor');
      expect(source, path).not.toContain('strictSameMinor');
      expect(source, path).not.toContain('LegacyCompatibility');
    }
  });

  it('documents the plan-verifier admission component with API, invariants, transitions, consumers, and diagrams', () => {
    const doc = readFileSync(COMPONENT_DOC, 'utf8');

    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(doc).toContain(section);
    }

    expect(doc).toContain('PLAN_RUNTIME_ADMISSION_MATRIX');
    expect(doc).toContain('verifyPlanVersionOrThrow');
    expect(doc).toContain('verifyPlanOrThrow');
    expect(doc).toContain('```mermaid');
  });
});
