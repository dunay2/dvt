import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';
import { fallbackGraphNodeClasses } from './graphVisualTokens';
import {
  graphNodeCardSurfaceClasses,
  graphNodeHealthBorderClasses,
  graphNodeTagListClasses,
} from './graphCardVisualTokens';
import { graphNodeColumnClasses } from './graphColumnVisualTokens';
import {
  graphNodeMetricRowClasses,
  graphNodeOperationalRailClasses,
} from './graphMetricVisualTokens';

const TOKEN_SOURCE = [
  'graphVisualTokens.ts',
  'graphCardVisualTokens.ts',
  'graphColumnVisualTokens.ts',
  'graphMetricVisualTokens.ts',
]
  .map((file) => readArchitectureSiblingSource(import.meta.dirname, file))
  .join('\n');
const GRAPH_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeRenderer.tsx'
);
const GRAPH_CARD_VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeCardView.tsx'
);
const GRAPH_NESTED_COLUMNS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeColumnChildren.tsx'
);
const GRAPH_NESTED_COLUMN_STYLES = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeColumnChildren.module.css'
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
  '../../../../../../docs/architecture/components/web/style-guide.md'
);
const USER_STORIES = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/style-guide.md'
);

const GRAPH_CONSUMER_SOURCES = [
  FALLBACK_RENDERER_SOURCE,
  CANVAS_NODE_MAPPER_SOURCE,
  DBT_NODE_CATALOG_SOURCE,
  DVT_NODE_CATALOG_SOURCE,
  DBT_NODE_RENDERER_SOURCE,
];
const GRAPH_CARD_PRESENTATION_SOURCES = [
  [GRAPH_CARD_VIEW_SOURCE, 'graphCardVisualTokens'],
  [GRAPH_METRIC_ROW_SOURCE, 'graphMetricVisualTokens'],
  [GRAPH_TAG_LIST_SOURCE, 'graphCardVisualTokens'],
  [GRAPH_OPERATIONAL_RAIL_SOURCE, 'graphMetricVisualTokens'],
  [GRAPH_HEALTH_POPOVER_SOURCE, 'graphMetricVisualTokens'],
  [FALLBACK_RENDERER_SOURCE, 'graphVisualTokens'],
] as const;

const FONT_SOURCE = readArchitectureSiblingSource(import.meta.dirname, '../../../styles/fonts.css');
const THEME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../styles/theme.css'
);
const MODEL_FAMILY_SOURCES = [
  'CanvasRelationalTreeCard.module.css',
  'CanvasRelationalTreeSourceCard.tsx',
  'CanvasRelationalTreeOutput.module.css',
  'CanvasRelationalFieldToken.module.css',
  'canvasSemanticEditor.css',
  'semanticWorkbenchRelationMetadata.ts',
  'semanticExpressionGraphLayout.ts',
  'join-condition/operandStyles.ts',
  'derivedOutputFormula.css',
].map((file) => readArchitectureSiblingSource(import.meta.dirname, `../../views/canvas/${file}`));
const TEXT_ROLE_CONSUMERS = [
  '../../components/inspector/SourceColumns.module.css',
  '../../components/inspector/inspectorVisualTokens.ts',
  '../../views/canvas/CanvasCardRemovalBar.module.css',
  '../../views/code/CodeFileHistoryPanel.tsx',
  '../../labs/SemanticWorkbenchLab.tsx',
  '../../views/canvas/CanvasContextualWorkbenchPanel.tsx',
  '../../views/canvas/CanvasModelOutputInspector.tsx',
  '../../views/canvas/CanvasRelationalTreeOutput.module.css',
  '../../views/canvas/canvasSemanticEditor.css',
  '../../views/canvas/CanvasSourceOccurrenceOutputs.tsx',
  '../../views/canvas/relational-inspection/RelationalInspectionPanel.tsx',
  '../../views/canvas/relational-source-occurrence/SourceOccurrenceProperties.templates.tsx',
  '../../views/canvas/SourceOverviewPanel.tsx',
];

describe('React Flow visual token convergence architecture', () => {
  it('keeps typography and shared focus/elevation definitions in their canonical owners', () => {
    // Local family overrides previously made the same Model identity use a different font.
    for (const role of ['body', 'meta', 'mono']) {
      expect(FONT_SOURCE).toContain(`--text-${role}:`);
      expect(FONT_SOURCE).toContain(`--text-${role}-line-height:`);
    }
    for (const role of ['focus-ring-width', 'focus-ring-offset', 'elevation-low']) {
      expect(THEME_SOURCE).toContain(`--${role}:`);
    }
    for (const source of MODEL_FAMILY_SOURCES) {
      expect(source).not.toMatch(/Segoe UI|IBM Plex|--font-(?:sans|mono)\s*:/);
    }
  });

  it('resolves semantic roles against the canonical theme, foundation and local declarations', () => {
    // An unknown role silently inherits or drops CSS, including hover and passive surfaces.
    expect(THEME_SOURCE).not.toMatch(/--text-primary\s*:/);
    const foundation = readArchitectureSiblingSource(
      import.meta.dirname,
      '../../../../node_modules/tailwindcss/theme.css'
    );
    const canonicalDefinitions = new Set(
      [...`${FONT_SOURCE}\n${THEME_SOURCE}\n${foundation}`.matchAll(/(--[\w-]+)\s*:/g)].map(
        (match) => match[1]
      )
    );
    const sources = [
      FONT_SOURCE,
      THEME_SOURCE,
      ...MODEL_FAMILY_SOURCES,
      ...TEXT_ROLE_CONSUMERS.map((path) =>
        readArchitectureSiblingSource(import.meta.dirname, path)
      ),
      ...[
        'graphCardVisualTokens.ts',
        'graphColumnVisualTokens.ts',
        'graphMetricVisualTokens.ts',
        '../../components/canvas/CanvasNodeShell.module.css',
        '../../views/canvas/CanvasRelationalPorts.module.css',
        '../../views/canvas/CanvasRelationalScalarTree.tsx',
      ].map((path) => readArchitectureSiblingSource(import.meta.dirname, path)),
    ];
    for (const source of sources) {
      const definitions = new Set([
        ...canonicalDefinitions,
        ...[...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
      ]);
      const references = new Set(
        source.match(/--(?:text|surface|border|focus|status|canvas-node-port|elevation)-[\w-]+/g)
      );
      for (const reference of references) expect(definitions.has(reference), reference).toBe(true);
    }
  });

  it('keeps Model operation identity separate from health, selection and Output type', () => {
    const card = MODEL_FAMILY_SOURCES[0]!;
    const output = MODEL_FAMILY_SOURCES[2];
    // A Read may represent a dbt model; category colors must not invent Source or execution status.
    for (const categoryRule of card.matchAll(/\[data-category=[^}]+\{([^}]+)\}/g)) {
      expect(categoryRule[1]).not.toMatch(/(?:color|background(?:-color)?|border-color)\s*:/);
    }
    expect(card).toContain('var(--surface-elevated)');
    expect(card).toContain('var(--surface-selected)');
    expect(card).toContain('var(--focus-ring)');
    expect(output).toContain('var(--canvas-node-port-output-ring)');
    expect(output).not.toContain('--status-success');
  });

  it('keeps nested field appearance and drop-state styling in its own stylesheet', () => {
    expect(GRAPH_NESTED_COLUMNS_SOURCE).toContain("from './GraphNodeColumnChildren.module.css'");
    expect(GRAPH_NESTED_COLUMNS_SOURCE).not.toMatch(
      /\bstyle\s*=|className\s*=\s*['"]|text-\[|data-\[drop-placement/
    );
    expect(GRAPH_NESTED_COLUMNS_SOURCE).toContain('className={styles.children}');
    expect(GRAPH_NESTED_COLUMNS_SOURCE).toContain('className={styles.field}');
    expect(GRAPH_NESTED_COLUMNS_SOURCE).toContain('data-drop-placement=');
    expect(GRAPH_NESTED_COLUMNS_SOURCE).toContain(
      'data-slot="graph-node-nested-column-drag-handle"'
    );
    expect(GRAPH_NESTED_COLUMNS_SOURCE).toContain('tabIndex={0}');
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain('@layer utilities');
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain(".field[data-drop-placement='before']");
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain(".field[data-drop-placement='after']");
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain('border-top-width: 2px');
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain('border-bottom-width: 2px');
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain('var(--color-blue-400)');
    expect(GRAPH_NESTED_COLUMN_STYLES).toContain('var(--font-mono)');
  });
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

  it('keeps health borders semantic and exposes status through the focusable node', () => {
    expect(graphNodeHealthBorderClasses).toEqual({
      healthy: 'border-solid border-(--status-success)',
      failed: 'border-dashed border-(--status-danger)',
      neutral: 'border-solid border-(--border-strong)',
    });
    expect(GRAPH_CARD_VIEW_SOURCE).not.toContain('GraphNodeStatusChip');
    expect(CANVAS_NODE_MAPPER_SOURCE).toContain('buildGraphNodeCardReadModel');
    expect(CANVAS_NODE_MAPPER_SOURCE).toContain('ariaLabel:');
    expect(CANVAS_NODE_MAPPER_SOURCE).toContain('healthLabel');
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
    for (const [source, owner] of GRAPH_CARD_PRESENTATION_SOURCES) {
      expect(source).toContain(owner);
      expect(source).not.toContain('graphVisualClasses');
    }
  });
});
