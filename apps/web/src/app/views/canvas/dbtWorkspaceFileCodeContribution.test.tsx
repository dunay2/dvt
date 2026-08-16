import { createRef, isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceFileCodeEditorHandle } from '../code/WorkspaceFileCodeEditor';
import { buildDbtWorkspaceFileCodeContributions } from './dbtWorkspaceFileCodeContribution';

const NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'analytics/models/orders.sql',
};

describe('buildDbtWorkspaceFileCodeContributions', () => {
  it('binds a file-backed dbt node to the shared editable Code surface', () => {
    const editorRef = createRef<WorkspaceFileCodeEditorHandle>();
    const reconcilePersistedFile = vi.fn();
    const contributions = buildDbtWorkspaceFileCodeContributions({
      node: NODE,
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
      path: NODE.path,
      reconcilePersistedFile,
    });
  });

  it('does not invent a Code file for a pathless node', () => {
    expect(
      buildDbtWorkspaceFileCodeContributions({
        node: { ...NODE, path: undefined },
        editorRef: createRef<WorkspaceFileCodeEditorHandle>(),
        reconcilePersistedFile: vi.fn(),
      })
    ).toEqual([]);
  });
});
