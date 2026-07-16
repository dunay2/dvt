import { describe, expect, it } from 'vitest';
import { parseExecutionSelection, type GenericGraphSourceV1 } from '@dvt/contracts';

import {
  buildDbtExecutionIntentDraftSignature,
  canOfferDbtExecutionSelectionToggle,
  resolveDbtExecutionScope,
} from './dbtExecutionScopePolicy';

describe('resolveDbtExecutionScope', () => {
  const executableNodeIds = ['model.base', 'model.orders', 'test.orders'];
  const dependencyIdsByNodeId = new Map<string, readonly string[]>([
    ['model.orders', ['model.base']],
    ['test.orders', ['model.orders']],
  ]);

  it('defaults an absent selection to executable workspace nodes', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: [],
        workspaceNodeIds: ['source.raw', 'model.base', 'model.orders'],
        executableNodeIds,
        dependencyIdsByNodeId,
      })
    ).toEqual({
      ok: true,
      selectionMode: 'workspace',
      requestedRootNodeIds: ['model.base', 'model.orders'],
      derivedDependencyNodeIds: [],
      nodeIds: ['model.base', 'model.orders'],
    });
  });

  it('rejects an explicit selection with no executable DBT resource', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: ['source.raw'],
        workspaceNodeIds: ['source.raw', 'model.base', 'model.orders'],
        executableNodeIds,
        dependencyIdsByNodeId,
      })
    ).toEqual({
      ok: false,
      cause: 'explicit_selection_contains_unavailable_or_non_executable_nodes',
      invalidNodeIds: ['source.raw'],
    });
  });

  it('rejects the complete intent when a mixed explicit selection contains an invalid member', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: ['source.raw', 'test.orders'],
        workspaceNodeIds: ['source.raw', ...executableNodeIds],
        executableNodeIds,
        dependencyIdsByNodeId,
      })
    ).toEqual({
      ok: false,
      cause: 'explicit_selection_contains_unavailable_or_non_executable_nodes',
      invalidNodeIds: ['source.raw'],
    });
  });

  it('distinguishes requested executable roots from dependencies included by closure', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: ['test.orders'],
        workspaceNodeIds: ['source.raw', ...executableNodeIds],
        executableNodeIds,
        dependencyIdsByNodeId,
      })
    ).toEqual({
      ok: true,
      selectionMode: 'explicit',
      requestedRootNodeIds: ['test.orders'],
      derivedDependencyNodeIds: ['model.base', 'model.orders'],
      nodeIds: executableNodeIds,
    });
  });

  it('keeps canonical executable order and terminates for cyclic dependency input', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: ['model.orders', 'model.orders'],
        workspaceNodeIds: executableNodeIds,
        executableNodeIds: ['model.orders', 'model.base', 'model.orders'],
        dependencyIdsByNodeId: new Map([
          ['model.orders', ['model.base']],
          ['model.base', ['model.orders']],
        ]),
      })
    ).toEqual({
      ok: true,
      selectionMode: 'explicit',
      requestedRootNodeIds: ['model.orders'],
      derivedDependencyNodeIds: ['model.base'],
      nodeIds: ['model.orders', 'model.base'],
    });
  });
});

describe('buildDbtExecutionIntentDraftSignature', () => {
  it('distinguishes workspace fallback from an explicit selection with the same closure', () => {
    const graphSource = {
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: [
        {
          nodeId: 'model.orders',
          stepKind: 'DBT_MODEL',
          dependsOn: [],
          metadata: { displayName: 'Orders' },
        },
      ],
    } satisfies GenericGraphSourceV1;
    const selection = parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['model.orders'],
    });

    const workspaceSignature = buildDbtExecutionIntentDraftSignature({
      graphSource,
      selection,
      selectionMode: 'workspace',
      requestedRootNodeIds: ['model.orders'],
    });
    const explicitSignature = buildDbtExecutionIntentDraftSignature({
      graphSource,
      selection,
      selectionMode: 'explicit',
      requestedRootNodeIds: ['model.orders'],
    });

    expect(workspaceSignature).not.toBe(explicitSignature);
  });
});

describe('canOfferDbtExecutionSelectionToggle', () => {
  it('offers selection for executable roots and cleanup for an invalid persisted selection', () => {
    expect(
      canOfferDbtExecutionSelectionToggle({
        isExecutableRoot: true,
        selectedForExecution: false,
      })
    ).toBe(true);
    expect(
      canOfferDbtExecutionSelectionToggle({
        isExecutableRoot: false,
        selectedForExecution: true,
      })
    ).toBe(true);
  });

  it('does not offer selection for an unselected non-executable resource', () => {
    expect(
      canOfferDbtExecutionSelectionToggle({
        isExecutableRoot: false,
        selectedForExecution: false,
      })
    ).toBe(false);
  });
});
