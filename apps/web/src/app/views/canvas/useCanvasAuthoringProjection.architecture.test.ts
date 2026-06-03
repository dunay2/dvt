import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const AUTHORING_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringProjection.ts'
);

describe('useCanvasAuthoringProjection architecture', () => {
  it('composes semantic authoring projection and viewport projection through explicit seams', () => {
    expect(AUTHORING_PROJECTION_SOURCE).toContain('buildCanvasAuthoringGraphProjection(');
    expect(AUTHORING_PROJECTION_SOURCE).toContain('useCanvasViewportGraphModel(');
    expect(AUTHORING_PROJECTION_SOURCE).not.toContain('useNodesState(');
    expect(AUTHORING_PROJECTION_SOURCE).not.toContain('useEdgesState(');
  });
});
