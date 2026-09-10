import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  ReactFlow,
  useNodesState,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import { Braces, Database, Equal, GitMerge, Hash, Plus } from 'lucide-react';

import DbtNodeComponent, { type DbtNodeData } from '../components/canvas/DbtNodeComponent';
import { OperationalDrawerDataTable } from '../components/shell/OperationalDrawerDataTable';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { dvtCanvasSurfaceStrategy } from '../plugins/dvt/dvtCanvasSurfaceStrategy';
import type {
  GraphNodeColumn,
  GraphNodeColumnOutputToggleIdentity,
} from '../plugins/graph/graphNodeColumnContracts';
import { getRegisteredPluginIds } from '../plugins/registry';
import { CanvasDependencyEdge } from '../views/canvas/CanvasDependencyEdge';
import { CanvasNodeWorkbenchOverlay } from '../views/canvas/CanvasNodeWorkbenchOverlay';
import type { CanvasInspectorAuthoringContract } from '../views/canvas/canvasInspectorAuthoring.types';
import {
  DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS,
  DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS,
  addDvtSubstraitJoinPredicateCondition,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  setDvtSubstraitJoinConnectionFieldSelected,
  setDvtSubstraitJoinPredicateFields,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitJoinComparisonOperator,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinDataType,
  type DvtSubstraitJoinPredicateOperand,
  type DvtSubstraitNInputJoinProjection,
} from '../views/canvas/canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import { useCanvasViewportGraphModel } from '../views/canvas/useCanvasViewportGraphModel';
import {
  SEMANTIC_WORKBENCH_EDGE,
  SEMANTIC_WORKBENCH_SOURCE,
  SEMANTIC_WORKBENCH_TRANSFORM,
  buildSemanticWorkbenchFixture,
} from './semanticWorkbenchFixture';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

const surface = '#040712';
const panel = '#09111f';
const border = '#263b5c';
const text = '#e2e8f0';
const muted = '#94a3b8';
const accent = '#7dd3fc';
const JOIN_COMPARISON_LABEL: Readonly<Record<DvtSubstraitJoinComparisonOperator, string>> = {
  equal: '=',
  not_equal: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};
const JOIN_OPERATION_SELECT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 7,
  border: '1px solid #0f766e',
  borderRadius: 6,
  background: '#05090f',
  padding: '8px 9px',
  color: '#34d399',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 9,
} as const;

const DVT_NODE_TYPES: NodeTypes = { dbtNode: DbtNodeComponent };
const DVT_EDGE_TYPES: EdgeTypes = { dependency: CanvasDependencyEdge };
const SEMANTIC_WORKBENCH_NODE_IDS = new Set([
  ...SEMANTIC_WORKBENCH_SOURCE.map((node) => node.id),
  SEMANTIC_WORKBENCH_TRANSFORM.id,
]);
const SEMANTIC_WORKBENCH_REGISTERED_PLUGINS = getRegisteredPluginIds();
const READ_ONLY_SEMANTIC_WORKBENCH_AUTHORING: CanvasInspectorAuthoringContract = {
  canEditNode: false,
  onApplyNodeDraft: () => {
    throw new Error('Semantic Workbench lab is read-only.');
  },
};

type SemanticWorkbenchSourceSample = Readonly<{
  nodeId: string;
  nodeName: string;
  columns: readonly Readonly<{ name: string }>[];
  rows: readonly Readonly<{ values: readonly (string | null)[] }>[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function projectSourceSample(
  source: (typeof SEMANTIC_WORKBENCH_SOURCE)[number]
): SemanticWorkbenchSourceSample | null {
  const rawColumns = source.metadata?.columns;
  const rawRows = source.metadata?.sampleRows;
  if (!Array.isArray(rawColumns) || !Array.isArray(rawRows)) return null;

  const columns = rawColumns.flatMap((column) =>
    isRecord(column) && typeof column.name === 'string' ? [{ name: column.name }] : []
  );
  if (columns.length !== rawColumns.length) return null;

  const rows = rawRows.flatMap((row) =>
    isRecord(row)
      ? [
          {
            values: columns.map(({ name }) => {
              const value = row[name];
              return value == null ? null : String(value);
            }),
          },
        ]
      : []
  );
  if (rows.length !== rawRows.length) return null;

  return { nodeId: source.id, nodeName: source.name, columns, rows };
}

const SEMANTIC_WORKBENCH_SOURCE_SAMPLES = SEMANTIC_WORKBENCH_SOURCE.flatMap((source) => {
  const sample = projectSourceSample(source);
  return sample == null ? [] : [sample];
});
const SEMANTIC_WORKBENCH_SOURCE_SAMPLE_IDS = new Set(
  SEMANTIC_WORKBENCH_SOURCE_SAMPLES.map(({ nodeId }) => nodeId)
);

type SemanticWorkbenchFixture = ReturnType<typeof buildSemanticWorkbenchFixture>;

function buildCanvasProcess(fixture: SemanticWorkbenchFixture) {
  const canonicalNodes = [...fixture.sources, fixture.transform];
  return {
    visibleNodeIds: canonicalNodes.map((node) => node.id),
    visibleEdges: fixture.edges.map(({ sourceId, targetId }) => ({
      sourceId,
      targetId,
    })),
    canonicalNodesById: new Map(canonicalNodes.map((node) => [node.id, node])),
    canonicalEdgeIdBySignature: new Map(
      fixture.edges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge.id])
    ),
    canonicalEdgeBySignature: new Map(
      fixture.edges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge])
    ),
    columnLevelLineageEnabled: true,
    persistedNodePositions: {
      [fixture.sources[0].id]: { x: 50, y: 20 },
      [fixture.sources[1].id]: { x: 50, y: 230 },
      [fixture.sources[2].id]: { x: 500, y: 125 },
      [fixture.transform.id]: { x: 950, y: 125 },
    },
  };
}

function inspectSemanticWorkbenchJoin(
  transform: SemanticWorkbenchFixture['transform']
): DvtSubstraitNInputJoinProjection | null {
  try {
    const authority = readDvtTransformAuthoringAuthority(transform);
    if (authority == null) return null;
    const inspection = inspectDvtSubstraitNInputJoinDraft(
      decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
    );
    return inspection.ok ? inspection.projection : null;
  } catch {
    return null;
  }
}

function projectSelectedFieldsBySourceId(
  fixture: SemanticWorkbenchFixture,
  projection: DvtSubstraitNInputJoinProjection | null
): ReadonlyMap<string, ReadonlySet<string>> {
  if (projection == null) return new Map();
  return new Map(
    fixture.sources.map((source) => {
      const rawSourceRef = source.metadata?.connectedSourceRef;
      const sourceObjectId =
        isRecord(rawSourceRef) && typeof rawSourceRef.sourceObjectId === 'string'
          ? rawSourceRef.sourceObjectId
          : null;
      const inputIndex = projection.inputs.findIndex(
        (input) => input.sourceRef.sourceObjectId === sourceObjectId
      );
      const selectedFields = projection.outputs.flatMap((output) =>
        output.source.inputIndex === inputIndex ? [output.source.name] : []
      );
      return [source.id, new Set(selectedFields)] as const;
    })
  );
}

type InspectNode = NonNullable<DbtNodeData['onInspectNode']>;
type WorkbenchRequest = Readonly<{
  nodeId: string;
  preferredTabId: 'general' | 'inputs-outputs' | 'tests' | 'code' | null;
  requestId: number;
}>;
type PendingJoinPredicate = Readonly<{
  joinRelationId: string;
  leftSourceFieldId: string;
  rightSourceFieldId: string;
  operator: DvtSubstraitJoinComparisonOperator;
}>;
type PendingJoinCondition = Readonly<{
  joinRelationId: string;
  sourceFieldId: string;
  rawValue: string;
  operator: DvtSubstraitJoinComparisonOperator;
  combination: DvtSubstraitJoinConditionCombination;
}>;

function parseJoinLiteral(
  dataType: DvtSubstraitJoinDataType,
  rawValue: string
): DvtSubstraitJoinPredicateOperand | null {
  if (dataType === 'string') {
    return { kind: 'literal', literal: { dataType: 'string', value: rawValue } };
  }
  if (dataType === 'bool') {
    return rawValue === 'true' || rawValue === 'false'
      ? { kind: 'literal', literal: { dataType: 'bool', value: rawValue === 'true' } }
      : null;
  }
  if (dataType === 'i64') {
    return /^-?\d+$/.test(rawValue)
      ? { kind: 'literal', literal: { dataType: 'i64', value: BigInt(rawValue) } }
      : null;
  }
  if (dataType === 'fp64') {
    const value = Number(rawValue);
    return rawValue.trim().length > 0 && Number.isFinite(value)
      ? { kind: 'literal', literal: { dataType: 'fp64', value } }
      : null;
  }
  const milliseconds = Date.parse(rawValue);
  return Number.isFinite(milliseconds)
    ? {
        kind: 'literal',
        literal: {
          dataType: 'precisionTimestampTz',
          value: new Date(milliseconds).toISOString(),
        },
      }
    : null;
}

function SemanticWorkbenchLab() {
  const [fixture, setFixture] = useState<SemanticWorkbenchFixture>(() =>
    buildSemanticWorkbenchFixture()
  );
  const canonicalNodes = useMemo(
    () => [...fixture.sources, fixture.transform],
    [fixture.sources, fixture.transform]
  );
  const [canvasProjection] = useState(() => buildCanvasProcess(fixture));
  const liveCanvasProjection = useMemo(
    () => ({
      ...canvasProjection,
      canonicalNodesById: new Map(canonicalNodes.map((node) => [node.id, node])),
    }),
    [canvasProjection, canonicalNodes]
  );
  const canvasProcess = useCanvasViewportGraphModel(liveCanvasProjection);
  const semanticGraph = useMemo(() => projectSemanticWorkbenchGraph(fixture.transform), [fixture]);
  const joinProjection = useMemo(
    () => inspectSemanticWorkbenchJoin(fixture.transform),
    [fixture.transform]
  );
  const selectedFieldsBySourceId = useMemo(
    () => projectSelectedFieldsBySourceId(fixture, joinProjection),
    [fixture, joinProjection]
  );
  const transformSample = useMemo(() => {
    const sample = fixture.projectTransformSample(fixture.transform);
    return sample == null
      ? null
      : {
          nodeId: fixture.transform.id,
          nodeName: fixture.transform.name,
          ...sample,
        };
  }, [fixture]);
  const [selectedCanvasId, setSelectedCanvasId] = useState(SEMANTIC_WORKBENCH_TRANSFORM.id);
  const [selectedSemanticId, setSelectedSemanticId] = useState(semanticGraph.relationId);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(
    SEMANTIC_WORKBENCH_EDGE[0]?.id ?? null
  );
  const [selectedSourceSampleId, setSelectedSourceSampleId] = useState<string | null>(null);
  const [workbenchRequest, setWorkbenchRequest] = useState<WorkbenchRequest | null>(null);
  const [pendingJoinPredicate, setPendingJoinPredicate] = useState<PendingJoinPredicate | null>(
    null
  );
  const [pendingJoinCondition, setPendingJoinCondition] = useState<PendingJoinCondition | null>(
    null
  );
  const handleInspectNode = useCallback<InspectNode>((nodeId, preferredTabId) => {
    if (!SEMANTIC_WORKBENCH_NODE_IDS.has(nodeId)) return;
    setSelectedCanvasId(nodeId);
    setWorkbenchRequest((current) => ({
      nodeId,
      preferredTabId: preferredTabId ?? 'general',
      requestId: (current?.requestId ?? 0) + 1,
    }));
  }, []);
  const closeWorkbench = useCallback(() => setWorkbenchRequest(null), []);
  const openSourceDataSample = useCallback((nodeId: string) => {
    setSelectedSourceSampleId(nodeId);
  }, []);
  const toggleConnectionColumn = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) => {
      setFixture((current) => {
        const outgoing = current.edges.filter((edge) => edge.sourceId === identity.nodeId);
        const edge =
          outgoing.length === 1
            ? outgoing[0]
            : outgoing.find((candidate) => candidate.id === selectedConnectionId);
        const sourceNode = current.sources.find((source) => source.id === identity.nodeId);
        if (edge == null || sourceNode == null || edge.targetId !== current.transform.id) {
          return current;
        }
        const authority = readDvtTransformAuthoringAuthority(current.transform);
        if (authority == null) return current;
        const currentDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
        const nextDraft = setDvtSubstraitJoinConnectionFieldSelected({
          draft: currentDraft,
          sourceNode,
          targetNode: current.transform,
          edge,
          columnName: identity.columnId,
          selected: identity.output,
        });
        if (nextDraft === currentDraft) return current;
        return {
          ...current,
          transform: applyDvtSubstraitSemanticDocument(
            current.transform,
            encodeDvtSubstraitInnerJoinDocument(nextDraft)
          ),
        };
      });
      setPendingJoinPredicate(null);
    },
    [selectedConnectionId]
  );
  const editJoinDraft = useCallback(
    (edit: (draft: DvtSubstraitInnerJoinDraft) => DvtSubstraitInnerJoinDraft) => {
      setFixture((current) => {
        const authority = readDvtTransformAuthoringAuthority(current.transform);
        if (authority == null) return current;
        const currentDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
        const nextDraft = edit(currentDraft);
        if (nextDraft === currentDraft) return current;
        return {
          ...current,
          transform: applyDvtSubstraitSemanticDocument(
            current.transform,
            encodeDvtSubstraitInnerJoinDocument(nextDraft)
          ),
        };
      });
    },
    []
  );
  const applyJoinPredicateFields = useCallback(
    (
      joinRelationId: string,
      leftSourceFieldId: string,
      rightSourceFieldId: string,
      operator: DvtSubstraitJoinComparisonOperator
    ) => {
      editJoinDraft((draft) =>
        setDvtSubstraitJoinPredicateFields({
          draft,
          joinRelationId,
          leftSourceFieldId,
          rightSourceFieldId,
          operator,
        })
      );
      setPendingJoinPredicate(null);
    },
    [editJoinDraft]
  );
  const addJoinCondition = useCallback(
    (
      joinRelationId: string,
      sourceFieldId: string,
      literal: DvtSubstraitJoinPredicateOperand,
      operator: DvtSubstraitJoinComparisonOperator,
      combination: DvtSubstraitJoinConditionCombination
    ) => {
      editJoinDraft((draft) =>
        addDvtSubstraitJoinPredicateCondition({
          draft,
          joinRelationId,
          condition: {
            left: { kind: 'field', sourceFieldId },
            right: literal,
            operator,
            combination,
          },
        })
      );
      setPendingJoinCondition(null);
    },
    [editJoinDraft]
  );
  const canvasNodes = useMemo(
    () =>
      canvasProcess.nodes.map((node) => {
        const selectedFields = selectedFieldsBySourceId.get(node.id);
        const outgoing = fixture.edges.filter((edge) => edge.sourceId === node.id);
        const activeConnection =
          outgoing.length === 1
            ? outgoing[0]
            : outgoing.find((edge) => edge.id === selectedConnectionId);
        const columns =
          selectedFields == null || !Array.isArray(node.data.columns)
            ? node.data.columns
            : (node.data.columns as GraphNodeColumn[]).map((column) => ({
                ...column,
                output: selectedFields.has(column.id ?? column.name),
              }));
        const canOpenDataSample =
          SEMANTIC_WORKBENCH_SOURCE_SAMPLE_IDS.has(node.id) ||
          (node.id === fixture.transform.id && transformSample != null);
        return {
          ...node,
          data: {
            ...node.data,
            columns,
            ...(node.id === fixture.transform.id && transformSample != null
              ? { rows: transformSample.rows.length }
              : {}),
            onInspectNode: handleInspectNode,
            ...(activeConnection == null
              ? {}
              : { onToggleCanvasConnectionColumn: toggleConnectionColumn }),
            ...(canOpenDataSample
              ? {
                  onOpenSourceDataSample: openSourceDataSample,
                  sourceDataSampleInteractionLabel:
                    'Doble clic o Intro para abrir la muestra de datos.',
                }
              : {}),
          },
        };
      }),
    [
      canvasProcess.nodes,
      fixture.edges,
      handleInspectNode,
      openSourceDataSample,
      selectedConnectionId,
      selectedFieldsBySourceId,
      toggleConnectionColumn,
      transformSample,
    ]
  );
  const selectedSourceSample =
    selectedSourceSampleId === fixture.transform.id
      ? transformSample
      : (SEMANTIC_WORKBENCH_SOURCE_SAMPLES.find(
          ({ nodeId }) => nodeId === selectedSourceSampleId
        ) ?? null);
  const selectedSemantic =
    semanticGraph.nodes.find((node) => node.id === selectedSemanticId) ??
    semanticGraph.nodes.find((node) => node.data.semanticKind !== 'group') ??
    null;
  const selectedJoinPredicate = useMemo(() => {
    const joinOperand = selectedSemantic?.data.joinOperand;
    if (joinProjection == null) return null;
    const joinRelationId =
      joinOperand?.joinRelationId ??
      (selectedSemantic?.data.semanticKind === 'relation' &&
      joinProjection.joinRelations.some((relation) => relation.relationId === selectedSemantic.id)
        ? selectedSemantic.id
        : null);
    if (joinRelationId == null) return null;
    const stageIndex = joinProjection.joinRelations.findIndex(
      (relation) => relation.relationId === joinRelationId
    );
    const predicate = joinProjection.joins[stageIndex];
    if (stageIndex < 0 || predicate == null) return null;
    const rightInputIndex = stageIndex + 1;
    const selectedOutputFieldIds = new Set(
      joinProjection.outputs.map((output) => output.source.fieldId)
    );
    const optionsFor = (operand: 'left' | 'right') =>
      joinProjection.inputs.flatMap((input, inputIndex) =>
        (operand === 'left' ? inputIndex < rightInputIndex : inputIndex === rightInputIndex)
          ? input.fields.flatMap((field) =>
              selectedOutputFieldIds.has(field.fieldId) ||
              field.fieldId === predicate.leftSourceFieldId ||
              field.fieldId === predicate.rightSourceFieldId
                ? [
                    {
                      fieldId: field.fieldId,
                      label: `${input.schema}.${input.table}.${field.name}`,
                      dataType: field.dataType,
                    },
                  ]
                : []
            )
          : []
      );
    const pending =
      pendingJoinPredicate?.joinRelationId === joinRelationId
        ? pendingJoinPredicate
        : {
            joinRelationId,
            leftSourceFieldId: predicate.leftSourceFieldId,
            rightSourceFieldId: predicate.rightSourceFieldId,
            operator: predicate.operator ?? 'equal',
          };
    const fieldTypeById = new Map(
      joinProjection.inputs.flatMap((input) =>
        input.fields.map((field) => [field.fieldId, field.dataType] as const)
      )
    );
    const conditionOptions = joinProjection.inputs.slice(0, rightInputIndex + 1).flatMap((input) =>
      input.fields.map((field) => ({
        fieldId: field.fieldId,
        label: `${input.schema}.${input.table}.${field.name}`,
        dataType: field.dataType,
      }))
    );
    const conditionDraft =
      pendingJoinCondition?.joinRelationId === joinRelationId ? pendingJoinCondition : null;
    const conditionField = conditionOptions.find(
      (option) => option.fieldId === conditionDraft?.sourceFieldId
    );
    return {
      ...pending,
      leftOptions: optionsFor('left'),
      rightOptions: optionsFor('right'),
      compatible:
        fieldTypeById.get(pending.leftSourceFieldId) ===
        fieldTypeById.get(pending.rightSourceFieldId),
      dirty:
        pending.leftSourceFieldId !== predicate.leftSourceFieldId ||
        pending.rightSourceFieldId !== predicate.rightSourceFieldId ||
        pending.operator !== (predicate.operator ?? 'equal'),
      conditionOptions,
      conditionDraft,
      conditionLiteral:
        conditionField == null || conditionDraft == null
          ? null
          : parseJoinLiteral(conditionField.dataType, conditionDraft.rawValue),
      additionalConditionCount: predicate.additionalConditions?.length ?? 0,
    };
  }, [joinProjection, pendingJoinCondition, pendingJoinPredicate, selectedSemantic]);
  const projectedSemanticNodes = useMemo(
    () =>
      semanticGraph.nodes.map((node) => {
        if (node.data.semanticKind === 'group') {
          return {
            ...node,
            data: {
              ...node.data,
              label: <span data-slot="semantic-workbench-group-label">{node.data.label}</span>,
            },
          };
        }

        const [title, ...detailLines] = node.data.label.split('\n');
        const subtitle = detailLines.join(' · ');
        const Icon =
          node.data.semanticKind === 'field'
            ? Hash
            : node.data.semanticKind === 'expression'
              ? Equal
              : node.data.semanticKind === 'literal'
                ? Braces
                : title === 'SOURCE'
                  ? Database
                  : GitMerge;
        const iconColor =
          node.data.semanticKind === 'field'
            ? '#7dd3fc'
            : node.data.semanticKind === 'expression'
              ? '#34d399'
              : title === 'SOURCE'
                ? '#60a5fa'
                : '#22d3ee';

        return {
          ...node,
          selected: node.id === selectedSemanticId,
          data: {
            ...node.data,
            label: (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    data-slot="semantic-workbench-node"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      minWidth: 0,
                      alignItems: 'center',
                      gap: 9,
                      padding: '9px 10px',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'grid',
                        width: 28,
                        height: 28,
                        flex: '0 0 28px',
                        placeItems: 'center',
                        border: `1px solid ${iconColor}`,
                        borderRadius: 6,
                        color: iconColor,
                        background: `${iconColor}14`,
                      }}
                    >
                      <Icon size={15} strokeWidth={1.8} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          color: iconColor,
                          fontSize: 9,
                          fontWeight: 750,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {title}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          color: text,
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 10,
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {subtitle}
                      </span>
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {node.data.detail}
                </TooltipContent>
              </Tooltip>
            ),
          },
        };
      }),
    [semanticGraph.nodes, selectedSemanticId]
  );
  const [semanticNodes, setSemanticNodes, onSemanticNodesChange] =
    useNodesState(projectedSemanticNodes);
  useEffect(() => {
    setSemanticNodes((current) => {
      const positionsById = new Map(current.map((node) => [node.id, node.position] as const));
      return projectedSemanticNodes.map((node) => ({
        ...node,
        position: positionsById.get(node.id) ?? node.position,
      }));
    });
  }, [projectedSemanticNodes, setSemanticNodes]);

  const selectedCanvasNode =
    canonicalNodes.find((node) => node.id === selectedCanvasId) ?? fixture.transform;
  const selectedConnection = fixture.edges.find((edge) => edge.id === selectedConnectionId) ?? null;
  const canvasEdges = useMemo(
    () =>
      canvasProcess.edges.map((edge) => ({
        ...edge,
        selected: edge.id === selectedConnectionId,
      })),
    [canvasProcess.edges, selectedConnectionId]
  );
  const inspectorNode =
    workbenchRequest == null
      ? null
      : (canonicalNodes.find((node) => node.id === workbenchRequest.nodeId) ?? null);
  const workbenchLayout = useMemo(
    () => ({
      focusMode: false,
      inspectorPanelVisible: inspectorNode != null,
      surfaceStrategy: dvtCanvasSurfaceStrategy,
    }),
    [inspectorNode]
  );
  const workbenchPanels = useMemo(
    () => ({
      activeRunId: null,
      inspectorAuthoring: READ_ONLY_SEMANTIC_WORKBENCH_AUTHORING,
      inspectorGraphEdges: fixture.edges,
      inspectorGraphNodes: canonicalNodes,
      inspectorNode,
      inspectorPreferredTabId: workbenchRequest?.preferredTabId ?? null,
      inspectorPreferredTabRequestId: workbenchRequest?.requestId ?? 0,
      inspectorWorkbenchContributions: [],
      registeredPlugins: SEMANTIC_WORKBENCH_REGISTERED_PLUGINS,
    }),
    [canonicalNodes, fixture.edges, inspectorNode, workbenchRequest]
  );

  return (
    <main
      style={{
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: surface,
        color: text,
        fontFamily: 'IBM Plex Sans, sans-serif',
        display: 'grid',
        gridTemplateRows: '72px minmax(220px, 36vh) 42px minmax(0, 1fr)',
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${border}`,
          background: panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: '12px 22px',
        }}
      >
        <div>
          <div style={{ color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
            SEMANTIC WORKBENCH LAB
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 650 }}>
            DVT process + Transform semantic focus
          </h1>
        </div>
        <div
          style={{
            color: muted,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            textAlign: 'right',
            lineHeight: 1.5,
          }}
        >
          127.0.0.1:5174/lab/semantic-workbench
          <br />
          real DVT objects · synthetic JSON · local only · no backend
        </div>
      </header>

      <section style={{ minHeight: 0, position: 'relative', borderBottom: `1px solid ${border}` }}>
        <ReactFlow
          nodes={canvasNodes}
          edges={canvasEdges}
          onNodesChange={canvasProcess.onNodesChange}
          onEdgesChange={canvasProcess.onEdgesChange}
          nodeTypes={DVT_NODE_TYPES}
          edgeTypes={DVT_EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 0.88 }}
          minZoom={0.35}
          maxZoom={1.1}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          selectNodesOnDrag
          multiSelectionKeyCode="Shift"
          onNodeClick={(_, node) => {
            setSelectedCanvasId(node.id);
            const outgoing = fixture.edges.filter((edge) => edge.sourceId === node.id);
            if (outgoing.length === 1) setSelectedConnectionId(outgoing[0]!.id);
            if (node.id === fixture.transform.id) {
              setSelectedSourceSampleId(null);
            }
          }}
          onEdgeClick={(_, edge) => setSelectedConnectionId(edge.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#182844" gap={24} size={1} />
        </ReactFlow>

        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
            zIndex: 4,
            border: `1px solid ${border}`,
            borderRadius: 8,
            background: 'rgba(7, 16, 30, 0.94)',
            padding: '8px 11px',
            color: muted,
            fontSize: 10,
            fontFamily: 'IBM Plex Mono, monospace',
            pointerEvents: 'none',
          }}
        >
          DVT CANVAS · 2 JSON-backed Sources + real Join Transform
        </div>

        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 14,
            zIndex: 4,
            border: `1px solid ${border}`,
            borderRadius: 8,
            background: 'rgba(7, 16, 30, 0.94)',
            padding: '8px 11px',
            color: selectedCanvasNode.kind === 'dvt:transform' ? accent : muted,
            fontSize: 10,
            fontFamily: 'IBM Plex Mono, monospace',
            pointerEvents: 'none',
          }}
        >
          {selectedConnection == null
            ? `selected: ${selectedCanvasNode.name}`
            : `connection: ${canonicalNodes.find((node) => node.id === selectedConnection.sourceId)?.name ?? selectedConnection.sourceId} -> ${canonicalNodes.find((node) => node.id === selectedConnection.targetId)?.name ?? selectedConnection.targetId}`}
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          padding: '0 18px',
          background: '#07101e',
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: accent }}>
          TRANSFORM FOCUS · {fixture.transform.name}
        </div>
        <div style={{ color: muted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
          semantic authority projection · relations + expressions · left → right
        </div>
      </div>

      <section
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {selectedSourceSample == null ? null : (
          <div
            data-slot="semantic-workbench-source-sample"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 6,
              minWidth: 0,
              overflow: 'auto',
              background: '#05090f',
              padding: 18,
            }}
          >
            <div
              style={{
                marginBottom: 14,
                color: accent,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {selectedSourceSample.nodeId === fixture.transform.id
                ? 'TRANSFORM OUTPUT'
                : 'SOURCE DATA'}{' '}
              - {selectedSourceSample.nodeName}
              <span style={{ marginLeft: 12, color: muted, fontWeight: 400 }}>
                {selectedSourceSample.rows.length} JSON rows
              </span>
            </div>
            <OperationalDrawerDataTable
              key={selectedSourceSample.nodeId}
              caption={
                selectedSourceSample.nodeId === fixture.transform.id
                  ? `Output sample from ${selectedSourceSample.nodeName}`
                  : `Data sample from ${selectedSourceSample.nodeName}`
              }
              columns={selectedSourceSample.columns}
              rows={selectedSourceSample.rows}
              nullValueLabel="NULL"
            />
          </div>
        )}
        <div style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
          <ReactFlow
            nodes={semanticNodes}
            edges={semanticGraph.edges}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            onNodesChange={onSemanticNodesChange}
            onNodeClick={(_, node) => {
              if (node.data.semanticKind !== 'group') {
                setSelectedSemanticId(node.id);
              }
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#182844" gap={24} size={1} />
          </ReactFlow>

          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 16,
              zIndex: 4,
              border: `1px solid ${border}`,
              borderRadius: 8,
              background: 'rgba(7, 16, 30, 0.94)',
              padding: '8px 11px',
              color: muted,
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              pointerEvents: 'none',
            }}
          >
            {semanticGraph.relationCount} relaciones · {semanticGraph.expressionCount} expresiones
            <span style={{ marginLeft: 12, color: '#60a5fa' }}>— flujo relacional</span>
            <span style={{ marginLeft: 10, color: '#34d399' }}>— expresión</span>
          </div>
        </div>

        <aside
          data-slot="semantic-workbench-inspector"
          style={{
            minHeight: 0,
            overflow: 'auto',
            borderLeft: `1px solid ${border}`,
            background: '#05090f',
            padding: 16,
          }}
        >
          <div style={{ color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em' }}>
            RESUMEN
          </div>
          {selectedSemantic == null ? (
            <p style={{ marginTop: 16, color: muted, fontSize: 11, lineHeight: 1.55 }}>
              Selecciona una relación, campo o expresión.
            </p>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  color: text,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {selectedSemantic.data.label.split('\n')[0]}
              </div>
              <div
                style={{
                  marginTop: 3,
                  color: muted,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                }}
              >
                {selectedSemantic.data.label.split('\n').slice(1).join(' · ')}
              </div>

              {selectedJoinPredicate == null ? null : (
                <div style={{ marginTop: 18 }}>
                  <div style={{ color: muted, fontSize: 9, fontWeight: 700 }}>
                    CONDICIÓN DEL JOIN
                  </div>
                  <label style={{ display: 'block', marginTop: 9, color: muted, fontSize: 9 }}>
                    CAMPO IZQUIERDO
                    <select
                      data-slot="semantic-workbench-left-field-select"
                      aria-label="Cambiar campo izquierdo del join"
                      title="Campos habilitados en la conexión superior izquierda."
                      value={selectedJoinPredicate.leftSourceFieldId}
                      onChange={(event) =>
                        setPendingJoinPredicate({
                          joinRelationId: selectedJoinPredicate.joinRelationId,
                          leftSourceFieldId: event.currentTarget.value,
                          rightSourceFieldId: selectedJoinPredicate.rightSourceFieldId,
                          operator: selectedJoinPredicate.operator,
                        })
                      }
                      style={{
                        width: '100%',
                        marginTop: 6,
                        border: '1px solid #245f88',
                        borderRadius: 7,
                        background: '#071827',
                        padding: '9px 10px',
                        color: accent,
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 10,
                      }}
                    >
                      {selectedJoinPredicate.leftOptions.map((option) => (
                        <option key={option.fieldId} value={option.fieldId}>
                          {option.label} · {option.dataType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <select
                    aria-label="Comparador de la condición principal"
                    title="Operador aplicado entre los dos campos del JOIN."
                    value={selectedJoinPredicate.operator}
                    style={JOIN_OPERATION_SELECT_STYLE}
                    onChange={(event) =>
                      setPendingJoinPredicate({
                        ...selectedJoinPredicate,
                        operator: event.currentTarget.value as DvtSubstraitJoinComparisonOperator,
                      })
                    }
                  >
                    {DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS.map((operator) => (
                      <option key={operator} value={operator}>
                        {JOIN_COMPARISON_LABEL[operator]}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: 'block', marginTop: 8, color: muted, fontSize: 9 }}>
                    CAMPO DERECHO
                    <select
                      data-slot="semantic-workbench-right-field-select"
                      aria-label="Cambiar campo derecho del join"
                      title="Campos habilitados en la conexión superior derecha."
                      value={selectedJoinPredicate.rightSourceFieldId}
                      onChange={(event) =>
                        setPendingJoinPredicate({
                          joinRelationId: selectedJoinPredicate.joinRelationId,
                          leftSourceFieldId: selectedJoinPredicate.leftSourceFieldId,
                          rightSourceFieldId: event.currentTarget.value,
                          operator: selectedJoinPredicate.operator,
                        })
                      }
                      style={{
                        width: '100%',
                        marginTop: 6,
                        border: '1px solid #245f88',
                        borderRadius: 7,
                        background: '#071827',
                        padding: '9px 10px',
                        color: accent,
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 10,
                      }}
                    >
                      {selectedJoinPredicate.rightOptions.map((option) => (
                        <option key={option.fieldId} value={option.fieldId}>
                          {option.label} · {option.dataType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!selectedJoinPredicate.compatible || !selectedJoinPredicate.dirty}
                    title={
                      selectedJoinPredicate.compatible
                        ? 'Aplicar ambos campos a la condición.'
                        : 'Los dos campos deben tener el mismo tipo.'
                    }
                    onClick={() =>
                      applyJoinPredicateFields(
                        selectedJoinPredicate.joinRelationId,
                        selectedJoinPredicate.leftSourceFieldId,
                        selectedJoinPredicate.rightSourceFieldId,
                        selectedJoinPredicate.operator
                      )
                    }
                    style={{
                      width: '100%',
                      marginTop: 12,
                      border: '1px solid #2563eb',
                      borderRadius: 7,
                      background:
                        selectedJoinPredicate.compatible && selectedJoinPredicate.dirty
                          ? '#12356b'
                          : '#111827',
                      padding: '9px 10px',
                      color:
                        selectedJoinPredicate.compatible && selectedJoinPredicate.dirty
                          ? '#dbeafe'
                          : '#64748b',
                      cursor:
                        selectedJoinPredicate.compatible && selectedJoinPredicate.dirty
                          ? 'pointer'
                          : 'not-allowed',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    Aplicar condición
                  </button>
                  {!selectedJoinPredicate.compatible ? (
                    <div style={{ marginTop: 7, color: '#fbbf24', fontSize: 9 }}>
                      Selecciona dos campos del mismo tipo.
                    </div>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-slot="semantic-workbench-add-join-condition"
                        aria-label="Añadir condición al join"
                        onClick={() => {
                          const option = selectedJoinPredicate.conditionOptions[0];
                          if (option == null) return;
                          setPendingJoinCondition({
                            joinRelationId: selectedJoinPredicate.joinRelationId,
                            sourceFieldId: option.fieldId,
                            rawValue: option.dataType === 'bool' ? 'true' : '',
                            operator: 'equal',
                            combination: 'and',
                          });
                        }}
                        style={{
                          display: 'flex',
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 10,
                          marginLeft: 'auto',
                          border: `1px solid ${border}`,
                          borderRadius: 7,
                          background: panel,
                          color: accent,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus aria-hidden="true" size={13} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Añadir condición al JOIN
                      {selectedJoinPredicate.additionalConditionCount === 0
                        ? ''
                        : ` · ${selectedJoinPredicate.additionalConditionCount} añadidas`}
                    </TooltipContent>
                  </Tooltip>
                  {selectedJoinPredicate.conditionDraft == null ? null : (
                    <div
                      data-slot="semantic-workbench-join-condition-editor"
                      style={{
                        marginTop: 8,
                        border: '1px solid #0f766e',
                        borderRadius: 8,
                        background: '#071827',
                        padding: 9,
                      }}
                    >
                      <select
                        aria-label="Conector de la condición adicional"
                        value={selectedJoinPredicate.conditionDraft.combination}
                        style={JOIN_OPERATION_SELECT_STYLE}
                        onChange={(event) =>
                          setPendingJoinCondition({
                            ...selectedJoinPredicate.conditionDraft!,
                            combination: event.currentTarget
                              .value as DvtSubstraitJoinConditionCombination,
                          })
                        }
                      >
                        {DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS.map((combination) => (
                          <option key={combination} value={combination}>
                            {combination.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Campo de la condición adicional"
                        value={selectedJoinPredicate.conditionDraft.sourceFieldId}
                        onChange={(event) => {
                          const option = selectedJoinPredicate.conditionOptions.find(
                            (candidate) => candidate.fieldId === event.currentTarget.value
                          );
                          if (option == null) return;
                          setPendingJoinCondition({
                            ...selectedJoinPredicate.conditionDraft!,
                            joinRelationId: selectedJoinPredicate.joinRelationId,
                            sourceFieldId: option.fieldId,
                            rawValue: option.dataType === 'bool' ? 'true' : '',
                          });
                        }}
                        style={{
                          width: '100%',
                          border: '1px solid #245f88',
                          borderRadius: 6,
                          background: '#05090f',
                          padding: '8px 9px',
                          color: accent,
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 9,
                        }}
                      >
                        {selectedJoinPredicate.conditionOptions.map((option) => (
                          <option key={option.fieldId} value={option.fieldId}>
                            {option.label} · {option.dataType}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Comparador de la condición adicional"
                        value={selectedJoinPredicate.conditionDraft.operator}
                        style={JOIN_OPERATION_SELECT_STYLE}
                        onChange={(event) =>
                          setPendingJoinCondition({
                            ...selectedJoinPredicate.conditionDraft!,
                            operator: event.currentTarget
                              .value as DvtSubstraitJoinComparisonOperator,
                          })
                        }
                      >
                        {DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS.map((operator) => (
                          <option key={operator} value={operator}>
                            {JOIN_COMPARISON_LABEL[operator]}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Valor literal de la condición adicional"
                        title="Introduce un valor del mismo tipo que el campo seleccionado."
                        value={selectedJoinPredicate.conditionDraft.rawValue}
                        onChange={(event) =>
                          setPendingJoinCondition({
                            ...selectedJoinPredicate.conditionDraft!,
                            rawValue: event.currentTarget.value,
                          })
                        }
                        placeholder="Valor literal"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          marginTop: 7,
                          border: '1px solid #245f88',
                          borderRadius: 6,
                          background: '#05090f',
                          padding: '8px 9px',
                          color: text,
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 9,
                        }}
                      />
                      <button
                        type="button"
                        disabled={selectedJoinPredicate.conditionLiteral == null}
                        title="Añadir la comparación con el conector seleccionado."
                        onClick={() => {
                          const literal = selectedJoinPredicate.conditionLiteral;
                          if (literal == null) return;
                          addJoinCondition(
                            selectedJoinPredicate.joinRelationId,
                            selectedJoinPredicate.conditionDraft!.sourceFieldId,
                            literal,
                            selectedJoinPredicate.conditionDraft!.operator,
                            selectedJoinPredicate.conditionDraft!.combination
                          );
                        }}
                        style={{
                          width: '100%',
                          marginTop: 7,
                          border: '1px solid #0f766e',
                          borderRadius: 6,
                          background:
                            selectedJoinPredicate.conditionLiteral == null ? '#111827' : '#064e3b',
                          padding: '8px 9px',
                          color:
                            selectedJoinPredicate.conditionLiteral == null ? '#64748b' : '#d1fae5',
                          cursor:
                            selectedJoinPredicate.conditionLiteral == null
                              ? 'not-allowed'
                              : 'pointer',
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        Añadir con {selectedJoinPredicate.conditionDraft.combination.toUpperCase()}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedSemantic.data.expression == null ? null : (
                <div
                  style={{
                    marginTop: 18,
                    border: '1px solid #245f88',
                    borderRadius: 8,
                    background: '#071827',
                    padding: '10px 11px',
                  }}
                >
                  <div style={{ color: muted, fontSize: 9, fontWeight: 700 }}>EXPRESIÓN</div>
                  <div
                    style={{
                      marginTop: 6,
                      color: accent,
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 11,
                    }}
                  >
                    {selectedSemantic.data.expression}
                  </div>
                </div>
              )}

              {selectedSemantic.data.detail === selectedSemantic.data.expression ? null : (
                <p style={{ margin: '16px 0 0', color: muted, fontSize: 11, lineHeight: 1.55 }}>
                  {selectedSemantic.data.detail}
                </p>
              )}

              {selectedSemantic.data.inputSummary == null &&
              selectedSemantic.data.outputSummary == null ? null : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  {selectedSemantic.data.inputSummary == null ? null : (
                    <div
                      style={{
                        border: `1px solid ${border}`,
                        borderRadius: 8,
                        background: panel,
                        padding: 10,
                      }}
                    >
                      <div style={{ color: muted, fontSize: 9 }}>ENTRADAS</div>
                      <div style={{ marginTop: 5, color: text, fontSize: 12, fontWeight: 650 }}>
                        {selectedSemantic.data.inputSummary}
                      </div>
                    </div>
                  )}
                  {selectedSemantic.data.outputSummary == null ? null : (
                    <div
                      style={{
                        border: `1px solid ${border}`,
                        borderRadius: 8,
                        background: panel,
                        padding: 10,
                      }}
                    >
                      <div style={{ color: muted, fontSize: 9 }}>SALIDAS</div>
                      <div style={{ marginTop: 5, color: text, fontSize: 12, fontWeight: 650 }}>
                        {selectedSemantic.data.outputSummary}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  marginTop: 16,
                  border: '1px solid #6d4b9e',
                  borderRadius: 8,
                  background: '#171026',
                  padding: '10px 11px',
                  color: '#c4b5fd',
                  fontSize: 10,
                  lineHeight: 1.45,
                }}
              >
                {selectedJoinPredicate == null
                  ? 'Proyección semántica de solo lectura.'
                  : 'El cambio actualiza la autoridad Substrait y recalcula la muestra del Transform.'}
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: muted,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 9,
                }}
              >
                {selectedSemantic.id}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              paddingTop: 14,
              borderTop: `1px solid ${border}`,
              color: muted,
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            El nivel superior es el Canvas DVT. Este grafo solo proyecta la semántica interna del
            Transform seleccionado.
          </div>
        </aside>
      </section>

      <CanvasNodeWorkbenchOverlay
        layout={workbenchLayout}
        panels={workbenchPanels}
        onHide={closeWorkbench}
      />
    </main>
  );
}

export default SemanticWorkbenchLab;
