import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const VIEWPORT_GRAPH_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasViewportGraphModel.ts'
);

describe('useCanvasViewportGraphModel architecture', () => {
  it('owns viewport projection only and does not merge semantic authority inputs', () => {
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).toContain('useNodesState(');
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).toContain('useEdgesState(');
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).not.toContain('draftSemanticGraph');
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).not.toContain('localCanonicalNodes');
  });
});
