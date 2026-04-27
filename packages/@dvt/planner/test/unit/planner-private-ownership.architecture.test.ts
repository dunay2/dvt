import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

const plannerOwnedPorts = [
  {
    sourcePath: 'packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts',
    symbol: 'IPlanExecutabilityValidator',
  },
  {
    sourcePath: 'packages/@dvt/planner/src/contracts/ExecutionBindingVerification.ts',
    symbol: 'IExecutionBindingVerifier',
  },
  {
    sourcePath: 'packages/@dvt/planner/src/contracts/PlanValidationLifecycle.ts',
    symbol: 'IPlanValidationLifecycleStore',
  },
  {
    sourcePath: 'packages/@dvt/planner/src/contracts/CustomPolicyNamespaceRegistry.ts',
    symbol: 'ICustomPolicyNamespaceRegistry',
  },
] as const;

describe('planner-private behavior ownership', () => {
  it('publishes planner-owned behavior ports from @dvt/planner source files', () => {
    for (const port of plannerOwnedPorts) {
      const source = readFile(port.sourcePath);

      expect(source).toMatch(new RegExp(`export\\s+interface\\s+${port.symbol}\\b`));
    }
  });

  it('exports planner-owned behavior ports from the @dvt/planner root barrel', () => {
    const rootBarrel = readFile('packages/@dvt/planner/src/index.ts');

    for (const port of plannerOwnedPorts) {
      expect(rootBarrel).toContain(port.symbol);
    }
  });
});

function readFile(path: string): string {
  const fullPath = resolve(repoRoot, path);
  expect(existsSync(fullPath)).toBe(true);
  return readFileSync(fullPath, 'utf8');
}
