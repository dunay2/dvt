import { createRef, isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceFileCodeEditorHandle } from '../code/WorkspaceFileCodeEditor';
import { buildDbtWorkspaceFileCodeContributions } from './dbtWorkspaceFileCodeContribution';

const NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/orders.sql',
  metadata: {
    authority: 'dbt-project-files',
    dbt: { packageName: 'analytics' },
  },
};

describe('buildDbtWorkspaceFileCodeContributions', () => {
  it('binds a file-backed dbt node to the shared editable Code surface', () => {
    const editorRef = createRef<WorkspaceFileCodeEditorHandle>();
    const reconcilePersistedFile = vi.fn();
    const contributions = buildDbtWorkspaceFileCodeContributions({
      node: NODE,
      projectRoot: 'analytics',
      editorRef,
      reconcilePersistedFile,
    });

    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({
      id: 'dbt-workspace-file-code-editor',
      nodeId: NODE.id,
      sectionId: 'code',
      placement: 'before-body',
    });
    expect(isValidElement(contributions[0]?.content)).toBe(true);
    if (!isValidElement(contributions[0]?.content)) {
      throw new Error('expected a workspace file editor contribution');
    }
    expect(contributions[0].content.props).toMatchObject({
      authority: 'dbt-project-files',
      path: 'analytics/models/orders.sql',
      reconcilePersistedFile,
    });
  });

  it.each([
    { projectRoot: '.', nodePath: 'models/orders.sql', expected: 'models/orders.sql' },
    {
      projectRoot: 'models',
      nodePath: 'models/orders.sql',
      expected: 'models/models/orders.sql',
    },
  ])('keeps canonical workspace path $expected stable', ({ projectRoot, nodePath, expected }) => {
    const contributions = buildDbtWorkspaceFileCodeContributions({
      node: { ...NODE, path: nodePath },
      projectRoot,
      editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
      reconcilePersistedFile: vi.fn(),
    });

    expect(contributions).toHaveLength(1);
    if (!isValidElement(contributions[0]?.content)) {
      throw new Error('expected a workspace file editor contribution');
    }
    expect(contributions[0].content.props).toMatchObject({ path: expected });
  });

  it('does not expose the editable workspace file rail for an external dbt package', () => {
    expect(
      buildDbtWorkspaceFileCodeContributions({
        node: {
          ...NODE,
          id: 'model.dbt_utils.orders',
          metadata: {
            authority: 'dbt-project-files',
            dbt: { packageName: 'dbt_utils' },
            packageName: 'dbt_utils',
            visualEditability: { status: 'code_only', reasons: ['external_package'] },
          },
        },
        projectRoot: 'analytics',
        editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
        reconcilePersistedFile: vi.fn(),
      })
    ).toEqual([]);
  });

  it('does not invent a Code file for a pathless node', () => {
    expect(
      buildDbtWorkspaceFileCodeContributions({
        node: { ...NODE, path: undefined },
        projectRoot: 'analytics',
        editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
        reconcilePersistedFile: vi.fn(),
      })
    ).toEqual([]);
  });
});
