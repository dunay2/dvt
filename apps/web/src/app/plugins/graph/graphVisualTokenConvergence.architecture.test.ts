import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';
import {
  fallbackGraphNodeClasses,
  graphNodeCardSurfaceClasses,
  graphNodeColumnClasses,
  graphNodeMetricRowClasses,
  graphNodeHealthBorderClasses,
  graphNodeOperationalRailClasses,
  graphNodeTagListClasses,
} from './graphVisualTokens';

const TOKEN_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'graphVisualTokens.ts');
const GRAPH_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeRenderer.tsx'
);
const GRAPH_CARD_VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeCardView.tsx'
);
const GRAPH_METRIC_ROW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeMetricRow.tsx'
);
const GRAPH_TAG_LIST_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeTagList.tsx'
);
const GRAPH_OPERATIONAL_RAIL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeOperationalRail.tsx'
);
const GRAPH_HEALTH_POPOVER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeHealthPopoverView.tsx'
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
const DBT_NODE_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dbt/DbtNodeRenderer.tsx'
);
const INSPECTOR_TOKEN_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/inspector/inspectorVisualTokens.ts'
);
const INSPECTOR_CONSUMER_SOURCES = [
  readArchitectureSiblingSource(
    import.meta.dirname,
    '../../components/inspector/NodePropertiesTabs.tsx'
  ),
  readArchitectureSiblingSource(
    import.meta.dirname,
    '../../components/inspector/NodePropertySectionView.tsx'
  ),
  readArchitectureSiblingSource(
    import.meta.dirname,
    '../../views/canvas/CanvasNodeWorkbenchPanel.tsx'
  ),
  readArchitectureSiblingSource(
    import.meta.dirname,
    '../../views/canvas/CanvasInspectorAuthoringSection.tsx'
  ),
];
const COMPONENT_GUIDE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/react-flow-visual-token-component.md'
);
const USER_STORIES = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/react-flow-visual-token-user-stories.md'
);

const GRAPH_CONSUMER_SOURCES = [
  FALLBACK_RENDERER_SOURCE,
  CANVAS_NODE_MAPPER_SOURCE,
  DBT_NODE_CATALOG_SOURCE,
  DVT_NODE_CATALOG_SOURCE,
  DBT_NODE_RENDERER_SOURCE,
];
const GRAPH_CARD_PRESENTATION_SOURCES = [
  GRAPH_CARD_VIEW_SOURCE,
  GRAPH_METRIC_ROW_SOURCE,
  GRAPH_TAG_LIST_SOURCE,
  GRAPH_OPERATIONAL_RAIL_SOURCE,
  GRAPH_HEALTH_POPOVER_SOURCE,
  FALLBACK_RENDERER_SOURCE,
];

describe('React Flow visual token convergence architecture', () => {
  it('keeps primary graph-node copy at a readable source size before viewport scaling', () => {
    const primaryCopyClasses = [
      graphNodeCardSurfaceClasses.root,
      graphNodeMetricRowClasses.root,
      graphNodeTagListClasses.tag,
      graphNodeOperationalRailClasses.label,
      graphNodeOperationalRailClasses.value,
      fallbackGraphNodeClasses.card,
      fallbackGraphNodeClasses.kind,
      graphNodeColumnClasses.row,
    ];

    expect(primaryCopyClasses.join(' ')).not.toMatch(/text-\[(?:9|10|11)px\]/);
  });

  it('keeps graph visual values behind the graph token component', () => {
    expect(TOKEN_SOURCE).toContain('Owned concern: own React Flow graph visual tokens');
    expect(TOKEN_SOURCE).toContain('graphNodeCardSurfaceClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeCardLayoutClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeMetricRowClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeTagListClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeOperationalRailClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeHealthPopoverClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeHealthBorderClasses');
    expect(TOKEN_SOURCE).toContain('fallbackGraphNodeClasses');
    expect(TOKEN_SOURCE).not.toContain('graphNodeStatusChipClasses');
    expect(TOKEN_SOURCE).not.toContain('graphStatusRingClasses');
    expect(TOKEN_SOURCE).toContain('graphNodeKindToneClasses');
    expect(TOKEN_SOURCE).toContain('graphFlowPalette');
    expect(TOKEN_SOURCE).toContain('resolveGraphNodeKindTone');
    expect(TOKEN_SOURCE).not.toContain('inspectorCard');
    expect(TOKEN_SOURCE).not.toContain('contextPanelRightShell');
    expect(TOKEN_SOURCE).not.toContain('graphStatusDotClasses');

    for (const source of GRAPH_CONSUMER_SOURCES) {
      expect(source).toContain('graphVisualTokens');
      expect(source).not.toMatch(/\b(?:slate|gray|neutral|zinc)-\d{2,3}\b/);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });

  it('keeps health borders semantic and status copy non-visual', () => {
    expect(graphNodeHealthBorderClasses).toEqual({
      healthy: 'border-solid border-green-500',
      failed: 'border-dashed border-red-500',
      neutral: 'border-solid border-slate-700',
    });
    expect(GRAPH_CARD_VIEW_SOURCE).toContain('graph-node-health-description');
    expect(GRAPH_CARD_VIEW_SOURCE).toContain('sr-only');
    expect(GRAPH_CARD_VIEW_SOURCE).not.toContain('GraphNodeStatusChip');
    expect(GRAPH_RENDERER_SOURCE).toContain('GraphNodeCardView');
    expect(GRAPH_RENDERER_SOURCE).not.toContain('graphNodeHealthBorderClasses');
    expect(GRAPH_RENDERER_SOURCE).not.toMatch(/\b(?:slate|gray|neutral|zinc)-\d{2,3}\b/);
    expect(GRAPH_RENDERER_SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('documents the graph visual token API, invariants, transitions, and consumers', () => {
    for (const expected of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '```mermaid',
      'graphNodeCardSurfaceClasses',
      'graphNodeOperationalRailClasses',
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

  it('keeps inspector and workbench visual tokens out of the graph token component', () => {
    expect(INSPECTOR_TOKEN_SOURCE).toContain(
      'Owned concern: own Inspector and node workbench visual tokens'
    );
    expect(INSPECTOR_TOKEN_SOURCE).toContain('inspectorVisualClasses');
    expect(INSPECTOR_TOKEN_SOURCE).toContain('inspectorStatusDotClasses');

    for (const source of INSPECTOR_CONSUMER_SOURCES) {
      expect(source).toContain('inspectorVisualTokens');
      expect(source).not.toContain('graphVisualClasses.inspector');
      expect(source).not.toContain('graphVisualClasses.contextPanel');
      expect(source).not.toContain('graphStatusDotClasses');
    }
  });

  it('keeps graph card presentation components on responsibility-specific token groups', () => {
    for (const source of GRAPH_CARD_PRESENTATION_SOURCES) {
      expect(source).toContain('graphVisualTokens');
      expect(source).not.toContain('graphVisualClasses');
    }
  });
});
