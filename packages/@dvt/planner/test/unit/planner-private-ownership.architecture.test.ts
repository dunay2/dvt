import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

const plannerOwnedPorts = [
  {
    barrelExport: './contracts/PlanExecutabilityValidation.js',
    contractVocabulary: ['ExecutabilityValidationResult', 'PlanRefSchemaT'],
    ownedConcern: 'validate persisted plan executability before execution admission',
    sourcePath: 'packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts',
    symbol: 'IPlanExecutabilityValidator',
  },
  {
    barrelExport: './contracts/ExecutionBindingVerification.js',
    contractVocabulary: ['ExecutionBindingVerificationResult'],
    ownedConcern: 'verify compiled artifact bindings for planner-authored steps',
    sourcePath: 'packages/@dvt/planner/src/contracts/ExecutionBindingVerification.ts',
    symbol: 'IExecutionBindingVerifier',
  },
  {
    barrelExport: './contracts/PlanValidationLifecycle.js',
    contractVocabulary: [
      'ExecutabilityValidationResult',
      'PlanRefSchemaT',
      'PlanValidationRecord',
      'PlannerBuildResultV1',
    ],
    ownedConcern: 'persist planner validation lifecycle transitions',
    sourcePath: 'packages/@dvt/planner/src/contracts/PlanValidationLifecycle.ts',
    symbol: 'IPlanValidationLifecycleStore',
  },
  {
    barrelExport: './contracts/CustomPolicyNamespaceRegistry.js',
    contractVocabulary: ['CustomPolicyNamespaceEntry'],
    ownedConcern: 'resolve custom policy namespace registration for planner policy checks',
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

  it('exports planner-owned behavior ports from the @dvt/planner root barrel as type-only ports', () => {
    const rootBarrel = readFile('packages/@dvt/planner/src/index.ts');

    for (const port of plannerOwnedPorts) {
      expect(rootBarrel).toContain(`export type { ${port.symbol} } from '${port.barrelExport}';`);
      expect(rootBarrel).not.toMatch(
        new RegExp(`export\\s+{[^}]*\\b${port.symbol}\\b[^}]*}\\s+from`)
      );
    }
  });

  it('starts each behavior-port module with its owned concern', () => {
    for (const port of plannerOwnedPorts) {
      const source = readFile(port.sourcePath);

      expect(source.trimStart()).toMatch(/^\/\*\*\r?\n \* Owned concern:/);
      expect(source.slice(0, 280)).toContain(port.ownedConcern);
    }
  });

  it('keeps planner behavior ports semantic and delegates DTO vocabulary to @dvt/contracts', () => {
    for (const port of plannerOwnedPorts) {
      const source = readFile(port.sourcePath);

      expect(source).toMatch(/import\s+type\s+{[\s\S]+}\s+from '@dvt\/contracts';/);
      expect(source).not.toMatch(/import\s+(?!type\b)[\s\S]+from '@dvt\/contracts';/);
      expect(source).not.toMatch(/export\s+(?:const|enum|type)\s+/);

      for (const contractSymbol of port.contractVocabulary) {
        expect(source).toMatch(new RegExp(`\\b${contractSymbol}\\b`));
      }
    }
  });

  it('keeps planner behavior-port modules free of peer domains and concrete adapters', () => {
    const forbiddenImportPattern =
      /from\s+['"](?:@dvt\/engine|@dvt\/adapter-[^'"]+|apps\/|@dvt\/contracts\/src)/;

    for (const port of plannerOwnedPorts) {
      const source = readFile(port.sourcePath);

      expect(source).not.toMatch(forbiddenImportPattern);
    }
  });
});

function readFile(path: string): string {
  const fullPath = resolve(repoRoot, path);
  expect(existsSync(fullPath)).toBe(true);
  return readFileSync(fullPath, 'utf8');
}
