/**
 * Owned concern: acquire the current sources inspected by the Graph visual-boundary guard.
 * @decision Keep source inventory changes separate from architecture assertion changes.
 * @consequence One test entry consumes explicit data; private acquisition dependencies stay local.
 */
import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

export const TOKEN_SOURCE = [
  'graphVisualTokens.ts',
  'graphCardVisualTokens.ts',
  'graphColumnVisualTokens.ts',
  'graphMetricVisualTokens.ts',
]
  .map((file) => readArchitectureSiblingSource(import.meta.dirname, file))
  .join('\n');
export const GRAPH_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeRenderer.tsx'
);
export const GRAPH_CARD_VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeCardView.tsx'
);
export const GRAPH_NESTED_COLUMNS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeColumnChildren.tsx'
);
export const GRAPH_NESTED_COLUMN_STYLES = readArchitectureSiblingSource(
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
export const CANVAS_NODE_MAPPER_SOURCE = readArchitectureSiblingSource(
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
export const INSPECTOR_TOKEN_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/inspector/inspectorVisualTokens.ts'
);
export const INSPECTOR_CONSUMER_SOURCES = [
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
export const COMPONENT_GUIDE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/style-guide.md'
);
export const USER_STORIES = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/style-guide.md'
);

export const GRAPH_CONSUMER_SOURCES = [
  FALLBACK_RENDERER_SOURCE,
  CANVAS_NODE_MAPPER_SOURCE,
  DBT_NODE_CATALOG_SOURCE,
  DVT_NODE_CATALOG_SOURCE,
  DBT_NODE_RENDERER_SOURCE,
];
export const GRAPH_CARD_PRESENTATION_SOURCES = [
  [GRAPH_CARD_VIEW_SOURCE, 'graphCardVisualTokens'],
  [GRAPH_METRIC_ROW_SOURCE, 'graphMetricVisualTokens'],
  [GRAPH_TAG_LIST_SOURCE, 'graphCardVisualTokens'],
  [GRAPH_OPERATIONAL_RAIL_SOURCE, 'graphMetricVisualTokens'],
  [GRAPH_HEALTH_POPOVER_SOURCE, 'graphMetricVisualTokens'],
  [FALLBACK_RENDERER_SOURCE, 'graphVisualTokens'],
] as const;

export const FONT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../styles/fonts.css'
);
export const THEME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../styles/theme.css'
);
export const MODEL_FAMILY_SOURCES = [
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
export const TEXT_ROLE_CONSUMERS = [
  '../../components/inspector/SourceColumns.module.css',
  '../../components/inspector/inspectorVisualTokens.ts',
  '../../views/canvas/CanvasCardRemovalBar.module.css',
  '../../views/code/CodeFileHistoryPanel.tsx',
  '../../labs/SemanticWorkbenchLab.tsx',
  '../../views/canvas/CanvasContextualWorkbenchPanel.tsx',
  '../../views/canvas/CanvasModelOutputInspector.tsx',
  '../../views/canvas/CanvasRelationalTreeOutput.module.css',
  '../../views/canvas/canvasSemanticEditor.css',
  '../../views/canvas/canvasWorkspaceTabs.css',
  '../../views/canvas/CanvasSourceOccurrenceOutputs.tsx',
  '../../views/canvas/relational-inspection/RelationalInspectionPanel.tsx',
  '../../views/canvas/relational-source-occurrence/SourceOccurrenceProperties.templates.tsx',
  '../../views/canvas/SourceOverviewPanel.tsx',
];
