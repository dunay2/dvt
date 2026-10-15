/** Compose the existing canonical Transform fixture with explicit Sink authoring. */
import { ConnectedSourceRefSchema, type WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { buildDvtJoinPreviewDraft } from './dvtJoinPreviewFixture.js';

export function buildDvtSinkPublicationDraft(): WorkspaceGraphAuthoringDraft {
  const draft = buildDvtJoinPreviewDraft(2);
  const transform = draft.nodes.find((node) => node.role === 'transform')!;
  transform.metadata = { ...transform.metadata, config: { materialized: 'ephemeral' } };
  const connectionRef = ConnectedSourceRefSchema.parse(
    draft.nodes[0]!.metadata?.connectedSourceRef
  ).connectionRef;
  draft.nodeIds.push('sink-orders');
  draft.nodePositions['sink-orders'] = { x: 480, y: 0 };
  draft.nodes.push({
    id: 'sink-orders',
    name: 'Published orders',
    pluginId: 'dvt',
    kind: 'dvt:sink',
    role: 'output',
    status: 'idle',
    tags: [],
    metadata: {
      config: {
        connectionRef,
        schema: 'analytics',
        table: 'orders_sink',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  });
  draft.edges.push({
    id: 'transform-sink',
    sourceId: transform.id,
    targetId: 'sink-orders',
    relation: 'lineage',
  });
  return draft;
}
