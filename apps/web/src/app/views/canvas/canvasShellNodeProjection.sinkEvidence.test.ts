/** Verify the shell forwards graph identity to the pure Sink evidence projection. */
import type { Node } from '@xyflow/react';
import { expect, it, vi } from 'vitest';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { createRunPublicationSnapshot } from '../runs/test/runPublicationFixture';
import { projectCanvasShellNodes } from './canvasShellNodeProjection';

it('updates only the published Sink without mutating cards sharing its destination', () => {
  const snapshot = createRunPublicationSnapshot();
  const evidence = snapshot.publication!;
  const nodes: Node<DbtNodeData>[] = ['sink-1', 'sink-2'].map((id) => ({
    id,
    position: { x: 0, y: 0 },
    data: {
      name: 'Same display name',
      status: 'idle',
      role: 'output',
      pluginKind: 'dvt:sink',
      metadata: {
        config: {
          connectionRef: evidence.target.connectionRef,
          schema: evidence.target.schema,
          table: evidence.target.relation,
        },
      },
    },
  }));
  const result = projectCanvasShellNodes(nodes, {
    modelIds: new Set(),
    openModel: vi.fn(),
    inspectOutput: vi.fn(),
    previewLabel: 'Preview',
    projectSample: () => ({ canOpen: false }),
    runSnapshot: snapshot,
  });
  expect(result[0]!.data).toMatchObject({
    rows: evidence.rowsWritten,
    durationMs: evidence.durationMs,
    lastRunAt: evidence.completedAt,
    runStatusByNodeId: new Map([['sink-1', 'completed']]),
  });
  expect(result[1]!.data.rows).toBeUndefined();
  expect(result[1]!.data.runStatusByNodeId).toBeUndefined();
  for (const node of nodes) {
    expect(node.data.rows).toBeUndefined();
    expect(node.data.runStatusByNodeId).toBeUndefined();
  }
});
