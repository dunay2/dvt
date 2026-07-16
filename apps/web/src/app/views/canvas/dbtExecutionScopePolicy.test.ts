import { describe, expect, it } from 'vitest';

import { resolveDbtExecutionScope } from './dbtExecutionScopePolicy';

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
    ).toEqual({ ok: true, nodeIds: ['model.base', 'model.orders'] });
  });

  it('rejects an explicit selection with no executable DBT resource', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: ['source.raw'],
        workspaceNodeIds: ['source.raw', 'model.base', 'model.orders'],
        executableNodeIds,
        dependencyIdsByNodeId,
      })
    ).toEqual({ ok: false, cause: 'explicit_selection_has_no_executable_nodes' });
  });

  it('preserves executable roots from a mixed selection and includes their closure', () => {
    expect(
      resolveDbtExecutionScope({
        selectedNodeIds: ['source.raw', 'test.orders'],
        workspaceNodeIds: ['source.raw', ...executableNodeIds],
        executableNodeIds,
        dependencyIdsByNodeId,
      })
    ).toEqual({ ok: true, nodeIds: executableNodeIds });
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
    ).toEqual({ ok: true, nodeIds: ['model.orders', 'model.base'] });
  });
});
