import { describe, expect, it } from 'vitest';

import { buildProtectedDraftRecord } from './workspaceGraphDraftAuthoring.test.fixtures';
import { buildDraftReadDeniedResponse } from './workspaceGraphDraftProtocol.test.fixtures';
import {
  projectWorkspaceGraphAuthoringDraftSnapshot,
  projectWorkspaceGraphDraftReadResponseSnapshot,
} from './workspaceGraphDraftSnapshotProjection';

const WORKSPACE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

describe('workspaceGraphDraftSnapshotProjection', () => {
  it('preserves DBT metadata-backed fields when projecting draft snapshots', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;
    const transformNode = protectedDraft.nodes.find((node) => node.id === 'transform_node');
    if (transformNode == null) {
      throw new Error('Expected transform_node fixture.');
    }
    const metadataColumns = [
      {
        name: 'order_id',
        type: 'INTEGER',
        nullable: false,
        description: 'Order identifier',
      },
    ];
    transformNode.metadata = {
      ...transformNode.metadata,
      package: 'analytics_core',
      compiledSql: 'select order_id from raw.orders',
      columns: metadataColumns,
    };

    const snapshot = projectWorkspaceGraphAuthoringDraftSnapshot(protectedDraft);

    const transformSnapshotNode = snapshot.nodes.find((node) => node.id === 'transform_node');
    expect(transformSnapshotNode).toMatchObject({
      package: 'analytics_core',
      compiledSql: 'select order_id from raw.orders',
      columns: metadataColumns,
    });
    expect(transformSnapshotNode?.columns).not.toBe(metadataColumns);
  });

  it('fails closed when protected draft snapshot reads are denied', () => {
    expect(() =>
      projectWorkspaceGraphDraftReadResponseSnapshot(buildDraftReadDeniedResponse(WORKSPACE_SCOPE))
    ).toThrow('Workspace graph snapshot read denied for the current scope');
  });
});
