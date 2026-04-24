/**
 * Owned concern: enforce the provider adapter semantic boundary. Adapters
 * execute by immutable PlanRef; engine/application code owns plan admission.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CONTRACT_ROOT = join(import.meta.dirname, '../src/adapters');
const DOCS_ROOT = join(
  import.meta.dirname,
  '../../../../docs/architecture/components/engine/contracts/engine'
);

describe('contracts: provider adapter semantic boundary', () => {
  it('keeps startRun pointer-backed instead of accepting executable plan objects', () => {
    const source = readFileSync(join(CONTRACT_ROOT, 'IProviderAdapter.v1.ts'), 'utf8');

    expect(source).not.toContain('ExecutionPlan');
    expect(source).toContain(
      'startRun(planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;'
    );
    expect(source).not.toContain('startRun(plan: ExecutionPlan');
  });

  it('documents PlanRef revalidation as the adapter execution contract', () => {
    const doc = readFileSync(join(DOCS_ROOT, 'IProviderAdapter.v1.md'), 'utf8');

    expect(doc).toContain('verified immutable `PlanRef`');
    expect(doc).toContain('revalidate `PlanRef.sha256`');
    expect(doc).not.toContain('exact verified plan object');
  });
});
