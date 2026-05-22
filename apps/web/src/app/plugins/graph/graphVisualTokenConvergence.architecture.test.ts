import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

const TOKEN_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'graphVisualTokens.ts');
const GRAPH_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeRenderer.tsx'
);
const FALLBACK_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../FallbackNodeRenderer.tsx'
);
const CANVAS_NODE_MAPPER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../views/canvas/canvasNodeMapper.ts'
);
const DBT_NODE_CATALOG_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../nodeTypeCatalog.dbt.ts'
);
const DVT_NODE_CATALOG_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dvt/dvtNodeTypeCatalog.ts'
);
const COMPONENT_GUIDE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/react-flow-visual-token-component.md'
);
const USER_STORIES = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/react-flow-visual-token-user-stories.md'
);

const GRAPH_CONSUMER_SOURCES = [
  GRAPH_RENDERER_SOURCE,
  FALLBACK_RENDERER_SOURCE,
  CANVAS_NODE_MAPPER_SOURCE,
  DBT_NODE_CATALOG_SOURCE,
  DVT_NODE_CATALOG_SOURCE,
];

describe('React Flow visual token convergence architecture', () => {
  it('keeps graph visual values behind the graph token component', () => {
    expect(TOKEN_SOURCE).toContain('Owned concern: own React Flow graph visual tokens');
    expect(TOKEN_SOURCE).toContain('graphVisualClasses');
    expect(TOKEN_SOURCE).toContain('graphStatusDotClasses');
    expect(TOKEN_SOURCE).toContain('graphStatusRingClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeKindToneClasses');
    expect(TOKEN_SOURCE).toContain('graphFlowPalette');
    expect(TOKEN_SOURCE).toContain('resolveGraphNodeKindTone');

    for (const source of GRAPH_CONSUMER_SOURCES) {
      expect(source).toContain('graphVisualTokens');
      expect(source).not.toMatch(/\b(?:slate|gray|neutral|zinc)-\d{2,3}\b/);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });

  it('documents the graph visual token API, invariants, transitions, and consumers', () => {
    for (const expected of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '```mermaid',
      'graphVisualClasses',
      'graphFlowPalette',
      'resolveGraphNodeKindTone',
    ]) {
      expect(COMPONENT_GUIDE).toContain(expected);
    }

    for (const storyId of [
      'US-F24-GRAPH-TOKEN-01',
      'US-F24-GRAPH-TOKEN-02',
      'US-F24-GRAPH-TOKEN-03',
    ]) {
      expect(USER_STORIES).toContain(storyId);
    }
  });
});
