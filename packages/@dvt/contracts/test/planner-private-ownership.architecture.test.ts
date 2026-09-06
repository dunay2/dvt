import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const plannerPrivatePorts = [
  {
    sourcePath: 'packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts',
    symbol: 'IPlanExecutabilityValidator',
  },
  {
    sourcePath: 'packages/@dvt/contracts/src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts',
    symbol: 'ICustomPolicyNamespaceRegistry',
  },
] as const;

describe('planner-private behavior ownership', () => {
  it('keeps planner-private behavior ports out of @dvt/contracts source files', () => {
    for (const port of plannerPrivatePorts) {
      const source = readFile(port.sourcePath);

      expect(source).not.toMatch(new RegExp(`export\\s+interface\\s+${port.symbol}\\b`));
    }
  });

  it('keeps planner-private behavior ports out of the @dvt/contracts root barrel', () => {
    const rootBarrel = readFile('packages/@dvt/contracts/src/index.ts');

    for (const port of plannerPrivatePorts) {
      expect(rootBarrel).not.toContain(port.symbol);
    }
  });

  it('retains shared serializable planner vocabulary in @dvt/contracts', () => {
    const rootBarrel = readFile('packages/@dvt/contracts/src/index.ts');

    expect(rootBarrel).toContain('EXECUTABILITY_REJECTION_CODES');
    expect(rootBarrel).toContain('ExecutabilityValidationResult');
    expect(rootBarrel).toContain('StoredPlanArtifactValidationRecord');
    expect(rootBarrel).toContain('CustomPolicyNamespaceEntry');
  });
});

function readFile(path: string): string {
  const fullPath = resolve(repoRoot, path);
  expect(existsSync(fullPath)).toBe(true);
  return readFileSync(fullPath, 'utf8');
}
