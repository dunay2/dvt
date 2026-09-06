import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

const plannerOwnedPorts = [
  {
    barrelExport: './contracts/PlanExecutabilityValidation.js',
    contractVocabulary: ['ExecutabilityValidationResult', 'ScopedPlanRef'],
    ownedConcern: 'validate persisted plan executability before execution admission',
    sourcePath: 'packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts',
    symbol: 'IPlanExecutabilityValidator',
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

  it('keeps custom policy namespace registry frozen until a real consumer reactivates it', () => {
    const port = plannerOwnedPorts.find(
      (candidate) => candidate.symbol === 'ICustomPolicyNamespaceRegistry'
    );
    expect(port).toBeDefined();
    const source = readFile(port!.sourcePath);
    const componentGuide = readFile(
      'docs/architecture/components/planner/planner-private-behavior-ports-component.md'
    );
    const constraints = readFile('docs/architecture/components/planner/planner-constraints.md');

    expect(source.slice(0, 520)).toContain('Frozen compatibility seam');
    expect(source.slice(0, 520)).toContain('real consumer and ADR-backed reactivation');
    expect(source).not.toMatch(/\b(register|validate|accept|authorize)Namespace\b/);
    expect(source).not.toMatch(/export\s+(?:class|function|const)\s+/);
    expect(componentGuide).toContain('Custom Policy Namespace Freeze');
    expect(componentGuide).toContain('real consumer and ADR-backed reactivation');
    expect(componentGuide).toContain('MUST NOT add registry implementations');
    expect(constraints).toContain('Custom policy namespace registry is frozen');
  });
});

function readFile(path: string): string {
  const fullPath = resolve(repoRoot, path);
  expect(existsSync(fullPath)).toBe(true);
  return readFileSync(fullPath, 'utf8');
}
