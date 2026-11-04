import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  buildCanvasInspectorCodeContributions,
  buildGraphDraftWorkspaceFileCodeContributions,
} from './graphDraftWorkspaceFileCodeContribution';

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
  it.each([false, true])(
    'keeps file references file-owned while retaining a true graph path conflict: %s',
    (hasConflict) => {
      const reference: CanonicalNode = {
        ...NODE,
        metadata: {
          dbtModelReference: {
            schemaVersion: 'workspace-dbt-model-reference.v1',
            canvasId: 'files',
            uniqueId: 'model.analytics.orders',
            relationId: 'external-relation',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              provider: 'postgres',
              connectionId: 'warehouse',
            },
            fields: [{ fieldId: 'field-1', name: 'id', dataType: 'text', nullable: true }],
          },
        },
      };
      expect(readWorkspaceDbtModelReference(reference)).not.toBeNull();
      const definitions = [reference, ...(hasConflict ? [{ ...NODE, id: 'graph-owned' }] : [])];
      const contributions = buildCanvasInspectorCodeContributions(
        { inspectorNode: reference, inspectorWorkbenchContributions: [] },
        definitions.map((canonicalNode, index) =>
          mapCanonicalNodeToCanvasNode({ canonicalNode, index, showColumns: false })
        )
      );
      expect(contributions).toHaveLength(1);
      const content = contributions[0]?.content;
      if (!isValidElement(content)) throw new Error('Expected the shared file editor.');
      expect(content.props).toMatchObject({ authority: 'dbt-project-files', path: NODE.path });
      expect(content.props.graphOwnedPaths.has(NODE.path)).toBe(hasConflict);
    }
  );

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
