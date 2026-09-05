import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildGraphDraftWorkspaceFileCodeContributions } from './graphDraftWorkspaceFileCodeContribution';

const NODE: CanonicalNode = {
  id: 'model-1',
  name: 'Model 1',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/model_1.sql',
};

describe('buildGraphDraftWorkspaceFileCodeContributions', () => {
  it('binds a graph-owned file to the shared read-only Code surface', () => {
    const graphOwnedPaths = new Set([NODE.path!]);
    const contributions = buildGraphDraftWorkspaceFileCodeContributions({
      node: NODE,
      path: NODE.path!,
      graphOwnedPaths,
    });

    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({
      id: 'graph-draft-workspace-file-code-editor',
      nodeId: NODE.id,
      sectionId: 'code',
      placement: 'before-body',
    });
    expect(isValidElement(contributions[0]?.content)).toBe(true);
    if (!isValidElement(contributions[0]?.content)) {
      throw new Error('expected a workspace file viewer contribution');
    }
    expect(contributions[0].content.props).toMatchObject({
      authority: 'graph-draft',
      path: NODE.path,
      graphOwnedPaths,
    });
  });
});
