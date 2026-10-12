/**
 * Owned concern: guard the neutral preparation and workload ownership boundaries.
 * @baseline ADR-0018: Shared values and application ports do not belong to providers.
 * @decision Inspect imports and re-exports, including named imports from public barrels.
 * @consequence A provider dependency cannot silently return to neutral components.
 * @version 1.0.0
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../../../../..');
const boundaries = [
  'apps/api/src/application/services/RunExecutionContextBindingUseCase.ts',
  'apps/api/src/application/ports/runExecutionContextPreparer.ts',
  'packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.shared.ts',
  'packages/@dvt/contracts/src/step-registry/StepArtifactRef.ts',
];

describe('neutral Run preparation ownership', () => {
  it.each(boundaries)('%s does not import or re-export a concrete provider', (path) => {
    const source = ts.createSourceFile(
      path,
      readFileSync(resolve(repository, path), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const dependencies = source.statements.filter(
      (statement) => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
    );
    for (const dependency of dependencies) {
      expect(dependency.getText(source)).not.toMatch(/dbt|postgres|duckdb|adapter-/iu);
    }
  });
});
