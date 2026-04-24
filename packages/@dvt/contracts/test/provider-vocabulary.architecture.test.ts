/**
 * Owned concern: enforce the hard-cut provider vocabulary for active runtime
 * contracts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CONTRACTS_ROOT = join(import.meta.dirname, '../src');
const DOCS_ROOT = join(import.meta.dirname, '../../../../docs/architecture/components/engine');

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
});
