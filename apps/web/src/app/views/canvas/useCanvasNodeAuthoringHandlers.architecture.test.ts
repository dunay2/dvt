import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const NODE_AUTHORING_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAuthoringHandlers.ts'
);
const NODE_DROP_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeDropHandlers.ts'
);
const AUTHORING_NODE_CREATION_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringNodeCreationHandlers.ts'
);
const NODE_ADMISSION_COMMAND_RUNNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAdmissionCommandRunner.ts'
);

function removalDelegations(source: string): readonly ts.CallExpression[] {
  const file = ts.createSourceFile('handlers.ts', source, ts.ScriptTarget.Latest, true);
  const calls: ts.CallExpression[] = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text : null;
      if (name === 'useCanvasNodeRemovalHandlers') calls.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return calls;
}

function removalScopeBindings(
  arg: ts.Expression | undefined
): readonly (readonly [string, string])[] | null {
  if (arg == null || !ts.isObjectLiteralExpression(arg)) return null;
  const bindings: [string, string][] = [];
  for (const property of arg.properties) {
    if (ts.isShorthandPropertyAssignment(property)) {
      bindings.push([property.name.text, property.name.text]);
      continue;
    }
    if (
      !ts.isPropertyAssignment(property) ||
      ts.isComputedPropertyName(property.name) ||
      !ts.isIdentifier(property.initializer)
    )
      return null;
    bindings.push([property.name.text, property.initializer.text]);
  }
  return bindings.sort(([first], [second]) => first.localeCompare(second));
}

describe('useCanvasNodeAuthoringHandlers architecture', () => {
  it('delegates screen coordinates to the viewport without reading nested target bounds', () => {
    expect(NODE_DROP_HANDLERS_SOURCE).toContain('useReactFlow');
    expect(NODE_DROP_HANDLERS_SOURCE).toContain('screenToFlowPosition(');
    expect(NODE_DROP_HANDLERS_SOURCE).toContain('snapToGrid: false');
    expect(NODE_DROP_HANDLERS_SOURCE).not.toContain('getBoundingClientRect');
    expect(NODE_DROP_HANDLERS_SOURCE).not.toContain('event.target');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('getBoundingClientRect');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('useReactFlow');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('screenToFlowPosition');
  });

  it('stays as a composition seam over node creation, duplicate, drop, and removal handlers', () => {
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeDropHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasAuthoringNodeCreationHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeDuplicateHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('useCanvasNodeRemovalHandlers');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('CanvasNodeAuthoringContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeDropContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeCreationContracts');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).toContain('nodeDuplicateContracts');
    const removal = removalDelegations(NODE_AUTHORING_HANDLERS_SOURCE);
    expect(removal).toHaveLength(1);
    expect(removal[0]!.arguments).toHaveLength(2);
    expect(removalScopeBindings(removal[0]!.arguments[0])).toEqual([
      ['effects', 'effects'],
      ['policy', 'policy'],
      ['state', 'state'],
    ]);
    expect(removal[0]!.arguments[1]!.getText()).toBe('runDraftSessionCommand');
    expect(
      removal[0]!
        .getSourceFile()
        .statements.some(
          (statement) =>
            ts.isImportDeclaration(statement) &&
            statement.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            statement.moduleSpecifier.text === './useCanvasNodeRemovalHandlers'
        )
    ).toBe(true);
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('toast.');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('setTimeout(');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('admitCanonicalNodeToCanvas');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('canvasInteractionCommands');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(NODE_AUTHORING_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });

  it('recognizes incomplete scope, stale bindings, missing runners and repeated removal calls', () => {
    const scope = [
      ['effects', 'effects'],
      ['policy', 'policy'],
      ['state', 'state'],
    ];
    for (const source of [
      'useCanvasNodeRemovalHandlers({ state, effects }, runDraftSessionCommand)',
      'useCanvasNodeRemovalHandlers({ state: staleState, effects, policy }, runDraftSessionCommand)',
    ])
      expect(removalScopeBindings(removalDelegations(source)[0]!.arguments[0])).not.toEqual(scope);
    expect(
      removalDelegations('useCanvasNodeRemovalHandlers({ state, effects, policy })')[0]!.arguments
    ).toHaveLength(1);
    expect(
      removalDelegations(
        'useCanvasNodeRemovalHandlers({}, runner); useCanvasNodeRemovalHandlers({}, runner)'
      )
    ).toHaveLength(2);
    const explicit = removalDelegations(
      'useCanvasNodeRemovalHandlers({ policy: policy, state: state, effects: effects }, runDraftSessionCommand)'
    );
    expect(removalScopeBindings(explicit[0]!.arguments[0])).toEqual(scope);
  });

  it('keeps node creation and drop React handlers outside state-updater side effects', () => {
    for (const source of [NODE_DROP_HANDLERS_SOURCE, AUTHORING_NODE_CREATION_HANDLERS_SOURCE]) {
      expect(source).toContain('useCanvasNodeAdmissionCommandRunner');
      expect(source).not.toContain('resolveCanvasNodeAdmissionTransaction');
      expect(source).not.toContain('setNodes((');
      expect(source).not.toContain('setDraftSession((');
    }

    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasNodeAdmissionTransaction');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('latestNodesRef');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('latestDraftSessionRef');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain(
      'latestNodesRef.current = transaction.nodes'
    );
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain(
      'latestDraftSessionRef.current = transaction.draftSession'
    );
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).not.toContain('toast.');
  });
});
