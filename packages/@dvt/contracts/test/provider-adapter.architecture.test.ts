/**
 * Owned concern: enforce the provider adapter semantic boundary. Adapters
 * execute by immutable PlanRef; engine/application code owns plan admission.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const ENGINE_ROOT = join(import.meta.dirname, '../../engine/src/adapters');
const DOCS_ROOT = join(
  import.meta.dirname,
  '../../../../docs/architecture/components/engine/contracts/engine'
);

describe('contracts: provider adapter semantic boundary', () => {
  it('keeps the provider adapter behavior port physically out of @dvt/contracts', () => {
    expect(
      existsSync(resolve(REPO_ROOT, 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts'))
    ).toBe(false);

    const contractsRoot = readFileSync(
      resolve(REPO_ROOT, 'packages/@dvt/contracts/src/index.ts'),
      'utf8'
    );
    const legacyRoot = readFileSync(resolve(REPO_ROOT, 'packages/@dvt/contracts/index.js'), 'utf8');

    expect(contractsRoot).not.toContain('IProviderAdapter');
    expect(legacyRoot).not.toContain('IProviderAdapter');
    expect(legacyRoot).not.toMatch(/src\/adapters|src\\adapters/);
  });

  it('keeps startRun pointer-backed instead of accepting executable plan objects', () => {
    const source = readFileSync(join(ENGINE_ROOT, 'IProviderAdapter.ts'), 'utf8');

    expect(source).not.toContain('ExecutionPlan');
    expect(source).toMatch(
      /startRun\(\s*planRef:\s*PlanRef,\s*ctx:\s*ResolvedRunContext\s*\):\s*Promise<EngineRunRef>;/
    );
    expect(source).not.toMatch(/startRun\(\s*plan:\s*ExecutionPlan/);
  });

  it('documents PlanRef revalidation as the adapter execution contract', () => {
    const doc = readFileSync(join(DOCS_ROOT, 'IProviderAdapter.v1.md'), 'utf8');

    expect(doc).toContain('verified immutable `PlanRef`');
    expect(doc).toContain('revalidate `PlanRef.sha256`');
    expect(doc).not.toContain('exact verified plan object');
  });
});
