/** Owned concern: guard the execution-selection recovery component boundary and rail vocabulary. */
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasExecutionSelectionRecovery.ts'
);
const HOOK_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasExecutionSelectionRecovery.ts'
);
const AUTHORITY_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasExecutionSelectionRecoveryAuthorityAdapter.ts'
);
const SCOPE_POLICY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'dbtExecutionScopePolicy.ts'
);
const VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/OperationalDrawerSelectionRecoveryView.tsx'
);
const PRESENTATION_PRIMITIVES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx'
);
const AUTHORED_CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasController.ts'
);
const EXTERNAL_AUTHORITY_CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useDbtProjectFilesAuthorityController.ts'
);
const DRAWER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/OperationalDrawerPanels.tsx'
);
const MESSAGES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/operationalDrawerSelectionRecoveryMessages.ts'
);

describe('canvas execution-selection recovery architecture', () => {
  it('separates pure policy, state adapter, and presentation template', () => {
    expect(MODEL_SOURCE).not.toContain("from 'react'");
    expect(MODEL_SOURCE).not.toContain('Store');
    expect(MODEL_SOURCE).toContain('buildCanvasExecutionSelectionRecoveryReadModel');
    expect(MODEL_SOURCE).toContain('recoverCanvasExecutionSelection');
    expect(MODEL_SOURCE).toContain('buildDbtExecutionScopeGraph');
    expect(MODEL_SOURCE).not.toContain('isDbtExecutionSelectableNode');
    expect(SCOPE_POLICY_SOURCE).toContain('export function buildDbtExecutionScopeGraph');

    expect(HOOK_SOURCE).toContain("from './canvasExecutionSelectionRecovery'");
    expect(HOOK_SOURCE).toContain('setSelectionIntent');
    expect(HOOK_SOURCE).toContain('refreshAnalysis');
    expect(HOOK_SOURCE).not.toContain('Authoritative analysis could not be refreshed.');
    expect(AUTHORITY_ADAPTER_SOURCE).toContain('if (result.isError)');
    expect(AUTHORITY_ADAPTER_SOURCE).not.toContain(
      'Authoritative analysis could not be refreshed.'
    );

    expect(VIEW_SOURCE).not.toContain('className=');
    expect(VIEW_SOURCE).not.toContain('Store');
    expect(VIEW_SOURCE).toContain("from './OperationalDrawerSelectionRecoveryPrimitives'");
    expect(PRESENTATION_PRIMITIVES_SOURCE).toContain('selectionRecoveryClassNames');
    expect(PRESENTATION_PRIMITIVES_SOURCE).toContain('var(--status-success)');
    expect(VIEW_SOURCE).not.toContain('Use workspace scope');
    expect(MESSAGES_SOURCE).toContain('OperationalDrawerSelectionRecoveryMessages');
    expect(MESSAGES_SOURCE).not.toContain('Authoritative analysis could not be refreshed.');
  });

  it('uses one query rail and one explicit recovery command rail', () => {
    expect(MODEL_SOURCE).toContain("queryRail: 'CollectCanvasExecutionSelection'");
    expect(MODEL_SOURCE).toContain("commandRail: 'RecoverCanvasExecutionSelection'");
    expect(MODEL_SOURCE).toContain("rail: 'RecoverCanvasExecutionSelection'");
  });

  it('keeps file execution recovery in the existing execution owner', () => {
    const imports = (source: string): string[] =>
      ts
        .createSourceFile('surface.ts', source, ts.ScriptTarget.Latest, true)
        .statements.filter(ts.isImportDeclaration)
        .flatMap((entry) =>
          ts.isStringLiteral(entry.moduleSpecifier) ? [entry.moduleSpecifier.text] : []
        );
    const execution = imports(
      readArchitectureSiblingSource(import.meta.dirname, 'useDbtProjectFileExecution.ts')
    );
    const recoveryDependencies = [
      './useCanvasExecutionSelectionRecovery',
      './canvasExecutionSelectionRecovery',
      './canvasExecutionSelectionRecoveryAuthorityAdapter',
    ];
    expect(execution).toEqual(expect.arrayContaining(recoveryDependencies));
    for (const controller of [AUTHORED_CONTROLLER_SOURCE, EXTERNAL_AUTHORITY_CONTROLLER_SOURCE]) {
      expect(
        imports(controller).filter((dependency) => recoveryDependencies.includes(dependency))
      ).toEqual([]);
    }
    expect(imports(EXTERNAL_AUTHORITY_CONTROLLER_SOURCE)).toContain('./useDbtProjectFileExecution');
    expect(AUTHORED_CONTROLLER_SOURCE).toContain(
      'executionSelectionRecovery: { model: null, commands: null }'
    );
    expect(DRAWER_SOURCE).toContain('<OperationalDrawerSelectionRecoveryView');
  });
});
