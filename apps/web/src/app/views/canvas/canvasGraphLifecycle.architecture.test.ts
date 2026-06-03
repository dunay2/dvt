import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const GRAPH_LIFECYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasGraphLifecycle.ts'
);

describe('canvasGraphLifecycle architecture', () => {
  it('exposes a namespaced component API instead of a flat helper catalog', () => {
    expect(GRAPH_LIFECYCLE_SOURCE).toContain('canvasGraphLifecycleNode');
    expect(GRAPH_LIFECYCLE_SOURCE).toContain('canvasGraphLifecycleEdge');
    expect(GRAPH_LIFECYCLE_SOURCE).toContain('node: canvasGraphLifecycleNode');
    expect(GRAPH_LIFECYCLE_SOURCE).toContain('edge: canvasGraphLifecycleEdge');
    expect(GRAPH_LIFECYCLE_SOURCE).not.toContain('export function ');
  });
});
