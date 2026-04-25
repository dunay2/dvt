import { describe, expect, it } from 'vitest';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import {
  createUnknownCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';
import { resolveActiveCanvasGraphStrategy } from './canvasActiveGraphStrategy';

function buildDraftReadModelWithCanvasKind(kind: string): CanvasDraftReadModel {
  const record: WorkspaceGraphDraftRecord = {
    revision: 'rev-1',
    savedAt: '2026-04-25T00:00:00Z',
    draft: {
      canvas: {
        kind,
        title: `${kind} canvas`,
      },
      nodeIds: [],
      nodePositions: {},
      edges: [],
    },
  };

  return createUnknownCanvasDraftReadModel(record);
}

describe('resolveActiveCanvasGraphStrategy', () => {
  it('uses the current draft canvas kind as the graph strategy selector', () => {
    expect(resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt')).id).toBe(
      'dbt'
    );
  });

  it('falls back to the transformation strategy before a canvas document exists', () => {
    expect(resolveActiveCanvasGraphStrategy(undefined).id).toBe('transformation');
    expect(
      resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('unknown')).id
    ).toBe('transformation');
  });
});
