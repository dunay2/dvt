import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import { ArrowLeft, Braces, Database, Equal, GitMerge, Hash, Maximize2, Plus } from 'lucide-react';

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
import { countDvtSubstraitJoinConditionComparisons } from '../views/canvas/canvasDvtSubstraitJoinCondition';
import { resolveDvtSubstraitJoinUnaryFunctions } from '../views/canvas/canvasDvtSubstraitJoinOperand';
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
import {
  SemanticWorkbenchJoinOperandEditor,
  buildSemanticWorkbenchJoinOperand,
  defaultSemanticWorkbenchJoinLiteralValue,
  type SemanticWorkbenchJoinOperandDraft,
} from './SemanticWorkbenchJoinOperandEditor';
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
  dataType: DvtSubstraitJoinDataType;
  left: SemanticWorkbenchJoinOperandDraft;
  right: SemanticWorkbenchJoinOperandDraft;
  operator: DvtSubstraitJoinComparisonOperator;
  combination: DvtSubstraitJoinConditionCombination;
  groupWithPrevious: boolean;
}>;

function SemanticWorkbenchLab() {
  const [fixture, setFixture] = useState<SemanticWorkbenchFixture>(() =>
    buildSemanticWorkbenchFixture()
  );
  const [expandedJoinRelationId, setExpandedJoinRelationId] = useState<string | null>(null);
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
  const semanticAuthorityGraph = useMemo(
    () => projectSemanticWorkbenchGraph(fixture.transform),
    [fixture.transform]
  );
  const semanticGraph = useMemo(
    () =>
      projectSemanticWorkbenchGraph(
        fixture.transform,
        expandedJoinRelationId == null
          ? { view: 'relations' }
          : { view: 'join-expression', joinRelationId: expandedJoinRelationId }
      ),
    [expandedJoinRelationId, fixture.transform]
  );
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
  const [selectedSemanticId, setSelectedSemanticId] = useState(semanticAuthorityGraph.relationId);
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
      left: DvtSubstraitJoinPredicateOperand,
      right: DvtSubstraitJoinPredicateOperand,
      operator: DvtSubstraitJoinComparisonOperator,
      combination: DvtSubstraitJoinConditionCombination,
      groupWithPrevious: boolean
    ) => {
      editJoinDraft((draft) =>
        addDvtSubstraitJoinPredicateCondition({
          draft,
          joinRelationId,
          condition: {
            left,
            right,
            operator,
            combination,
          },
          groupWithPrevious,
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
    semanticAuthorityGraph.nodes.find((node) => node.id === selectedSemanticId) ??
    semanticAuthorityGraph.nodes.find((node) => node.data.semanticKind !== 'group') ??
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
    const conditionOptions = joinProjection.inputs
      .slice(0, rightInputIndex + 1)
      .flatMap((input, inputIndex) =>
        input.fields.map((field) => ({
          fieldId: field.fieldId,
          label: `${input.schema}.${input.table}.${field.name}`,
          dataType: field.dataType,
          inputIndex,
        }))
      );
    const conditionDataTypes = Array.from(
      new Set(conditionOptions.map((option) => option.dataType))
    );
    const conditionDraft =
      pendingJoinCondition?.joinRelationId === joinRelationId ? pendingJoinCondition : null;
    const conditionLeftField = conditionOptions.find(
      (option) => option.fieldId === conditionDraft?.left.fieldId
    );
    const conditionRightField = conditionOptions.find(
      (option) => option.fieldId === conditionDraft?.right.fieldId
    );
    const conditionLeftOptions =
      conditionDraft == null
        ? []
        : conditionOptions.filter(
            (option) =>
              option.dataType === conditionDraft.dataType &&
              (conditionDraft.right.kind !== 'field' ||
                option.fieldId !== conditionDraft.right.fieldId)
          );
    const conditionRightOptions =
      conditionDraft == null
        ? []
        : conditionOptions.filter(
            (option) =>
              option.dataType === conditionDraft.dataType &&
              (conditionDraft.left.kind !== 'field' ||
                option.fieldId !== conditionDraft.left.fieldId)
          );
    const conditionFunctions =
      conditionDraft == null
        ? []
        : resolveDvtSubstraitJoinUnaryFunctions({
            dataType: conditionDraft.dataType,
            provider: 'postgres',
          });
    const conditionLeftOperand =
      conditionDraft == null ||
      (conditionDraft.left.kind === 'field' &&
        conditionLeftField?.dataType !== conditionDraft.dataType)
        ? null
        : buildSemanticWorkbenchJoinOperand({
            draft: conditionDraft.left,
            dataType: conditionDraft.dataType,
          });
    const conditionRightOperand =
      conditionDraft == null ||
      (conditionDraft.right.kind === 'field' &&
        conditionRightField?.dataType !== conditionDraft.dataType)
        ? null
        : buildSemanticWorkbenchJoinOperand({
            draft: conditionDraft.right,
            dataType: conditionDraft.dataType,
          });
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
      conditionDataTypes,
      conditionLeftOptions,
      conditionRightOptions,
      conditionFunctions,
      conditionDraft,
      conditionLeftOperand,
      conditionRightOperand,
      additionalConditionCount: countDvtSubstraitJoinConditionComparisons(
        predicate.additionalConditions ?? []
      ),
    };
  }, [joinProjection, pendingJoinCondition, pendingJoinPredicate, selectedSemantic]);
  const semanticNodeTypes = useMemo<NodeTypes>(
    () => ({
      semanticRelation: ({ data }) => {
        const relationKind = data.relationKind;
        const handleStyle = {
          width: 10,
          height: 10,
          border: '2px solid #22d3ee',
          background: '#071827',
        };
        const portLabelStyle = {
          position: 'absolute' as const,
          zIndex: 2,
          color: '#67e8f9',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 8,
          fontWeight: 700,
          pointerEvents: 'none' as const,
        };

        return (
          <div
            data-slot="semantic-workbench-relation-node"
            style={{ position: 'relative', minHeight: relationKind === 'join' ? 76 : 56 }}
          >
            {relationKind === 'join' ? (
              <>
                <Handle
                  id="left"
                  type="target"
                  position={Position.Left}
                  isConnectable={false}
                  style={{ ...handleStyle, top: '32%' }}
                />
                <span style={{ ...portLabelStyle, top: '21%', left: 5 }}>L</span>
                <Handle
                  id="right"
                  type="target"
                  position={Position.Left}
                  isConnectable={false}
                  style={{ ...handleStyle, top: '70%' }}
                />
                <span style={{ ...portLabelStyle, top: '59%', left: 5 }}>R</span>
              </>
            ) : relationKind === 'read' ? null : (
              <Handle
                id="in"
                type="target"
                position={Position.Left}
                isConnectable={false}
                style={handleStyle}
              />
            )}
            {data.label as ReactNode}
            <Handle
              id="out"
              type="source"
              position={Position.Right}
              isConnectable={false}
              style={handleStyle}
            />
            {relationKind === 'join' ? (
              <span
                style={{
                  ...portLabelStyle,
                  top: '43%',
                  right: 7,
                  transform: 'translateY(-50%)',
                }}
              >
                OUT
              </span>
            ) : null}
          </div>
        );
      },
    }),
    []
  );
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
                          overflow: node.data.relationKind === 'join' ? 'visible' : 'hidden',
                          color: text,
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 10,
                          lineHeight: 1.35,
                          textOverflow: node.data.relationKind === 'join' ? 'clip' : 'ellipsis',
                          whiteSpace: node.data.relationKind === 'join' ? 'normal' : 'nowrap',
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
      if (expandedJoinRelationId != null) return projectedSemanticNodes;
      const positionsById = new Map(current.map((node) => [node.id, node.position] as const));
      return projectedSemanticNodes.map((node) => ({
        ...node,
        position: positionsById.get(node.id) ?? node.position,
      }));
    });
  }, [expandedJoinRelationId, projectedSemanticNodes, setSemanticNodes]);
  const semanticSourceCount = semanticAuthorityGraph.nodes.filter(
    (node) => node.data.relationKind === 'read'
  ).length;
  const semanticJoinCount = semanticAuthorityGraph.nodes.filter(
    (node) => node.data.relationKind === 'join'
  ).length;

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
          {expandedJoinRelationId == null
            ? 'relational projection · expressions on demand'
            : 'selected JOIN · semantic expression detail'}
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
            nodeTypes={semanticNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={expandedJoinRelationId == null}
            nodesConnectable={false}
            elementsSelectable={expandedJoinRelationId == null}
            onNodesChange={onSemanticNodesChange}
            onNodeClick={(_, node) => {
              if (expandedJoinRelationId == null && node.data.semanticKind !== 'group') {
                setSelectedSemanticId(node.id);
              }
            }}
            onNodeDoubleClick={(_, node) => {
              if (node.data.relationKind !== 'join') return;
              setSelectedSemanticId(node.id);
              setExpandedJoinRelationId(node.id);
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
              pointerEvents: 'auto',
            }}
          >
            {expandedJoinRelationId == null ? (
              <>
                Relational flow · {semanticSourceCount} sources · {semanticJoinCount} joins
              </>
            ) : (
              <button
                type="button"
                aria-label="Volver al flujo relacional"
                onClick={() => setExpandedJoinRelationId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 0,
                  background: 'transparent',
                  padding: 0,
                  color: '#34d399',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                <ArrowLeft aria-hidden="true" size={12} />
                JOIN expression · {semanticGraph.expressionCount} nodes
              </button>
            )}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-slot="semantic-workbench-expand-expression"
                      aria-label={
                        expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                          ? 'Volver al flujo relacional'
                          : 'Expandir la expresión del join'
                      }
                      aria-pressed={expandedJoinRelationId === selectedJoinPredicate.joinRelationId}
                      onClick={() =>
                        setExpandedJoinRelationId((current) =>
                          current === selectedJoinPredicate.joinRelationId
                            ? null
                            : selectedJoinPredicate.joinRelationId
                        )
                      }
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        marginTop: 12,
                        border: `1px solid ${border}`,
                        borderRadius: 7,
                        background:
                          expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                            ? '#063c35'
                            : panel,
                        padding: '8px 10px',
                        color:
                          expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                            ? '#6ee7b7'
                            : accent,
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {expandedJoinRelationId === selectedJoinPredicate.joinRelationId ? (
                        <ArrowLeft aria-hidden="true" size={13} />
                      ) : (
                        <Maximize2 aria-hidden="true" size={13} />
                      )}
                      {expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                        ? 'Volver al flujo relacional'
                        : 'Expand expression'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                      ? 'Ocultar el AST y volver a las relaciones.'
                      : 'Mostrar sólo el árbol Substrait de este JOIN.'}
                  </TooltipContent>
                </Tooltip>
              )}

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
                          const leftOption = selectedJoinPredicate.conditionOptions[0];
                          if (leftOption == null) return;
                          const rightOption = selectedJoinPredicate.conditionOptions.find(
                            (option) =>
                              option.inputIndex !== leftOption.inputIndex &&
                              option.dataType === leftOption.dataType
                          );
                          setPendingJoinCondition({
                            joinRelationId: selectedJoinPredicate.joinRelationId,
                            dataType: leftOption.dataType,
                            left: {
                              kind: 'field',
                              fieldId: leftOption.fieldId,
                              rawValue: defaultSemanticWorkbenchJoinLiteralValue(
                                leftOption.dataType
                              ),
                              functionIds: [],
                            },
                            right: {
                              kind: rightOption == null ? 'literal' : 'field',
                              fieldId: rightOption?.fieldId ?? leftOption.fieldId,
                              rawValue: defaultSemanticWorkbenchJoinLiteralValue(
                                leftOption.dataType
                              ),
                              functionIds: [],
                            },
                            operator: 'equal',
                            combination: 'and',
                            groupWithPrevious: false,
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
                      <label style={{ display: 'block', marginTop: 8, color: muted, fontSize: 9 }}>
                        TIPO DE DATO
                        <select
                          aria-label="Tipo de dato de la condición adicional"
                          value={selectedJoinPredicate.conditionDraft.dataType}
                          style={JOIN_OPERATION_SELECT_STYLE}
                          onChange={(event) => {
                            const dataType = event.currentTarget.value as DvtSubstraitJoinDataType;
                            const options = selectedJoinPredicate.conditionOptions.filter(
                              (option) => option.dataType === dataType
                            );
                            const leftField = options[0];
                            if (leftField == null) return;
                            const rightField =
                              options.find(
                                (option) => option.inputIndex !== leftField.inputIndex
                              ) ?? options.find((option) => option.fieldId !== leftField.fieldId);
                            const current = selectedJoinPredicate.conditionDraft!;
                            setPendingJoinCondition({
                              ...current,
                              dataType,
                              left: {
                                ...current.left,
                                kind:
                                  rightField == null &&
                                  current.left.kind === 'literal' &&
                                  current.right.kind === 'literal'
                                    ? 'field'
                                    : current.left.kind,
                                fieldId: leftField.fieldId,
                                rawValue: defaultSemanticWorkbenchJoinLiteralValue(dataType),
                                functionIds: [],
                              },
                              right: {
                                ...current.right,
                                kind:
                                  rightField == null && current.left.kind === 'field'
                                    ? 'literal'
                                    : current.right.kind,
                                fieldId: rightField?.fieldId ?? leftField.fieldId,
                                rawValue: defaultSemanticWorkbenchJoinLiteralValue(dataType),
                                functionIds: [],
                              },
                            });
                          }}
                        >
                          {selectedJoinPredicate.conditionDataTypes.map((dataType) => (
                            <option key={dataType} value={dataType}>
                              {dataType}
                            </option>
                          ))}
                        </select>
                      </label>
                      <SemanticWorkbenchJoinOperandEditor
                        side="izquierdo"
                        operand={selectedJoinPredicate.conditionDraft.left}
                        dataType={selectedJoinPredicate.conditionDraft.dataType}
                        fields={selectedJoinPredicate.conditionLeftOptions}
                        functions={selectedJoinPredicate.conditionFunctions}
                        literalDisabled={
                          selectedJoinPredicate.conditionDraft.right.kind === 'literal'
                        }
                        onChange={(left) =>
                          setPendingJoinCondition({
                            ...selectedJoinPredicate.conditionDraft!,
                            left,
                          })
                        }
                      />
                      <label style={{ display: 'block', marginTop: 8, color: muted, fontSize: 9 }}>
                        COMPARACIÓN
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
                      </label>
                      <SemanticWorkbenchJoinOperandEditor
                        side="derecho"
                        operand={selectedJoinPredicate.conditionDraft.right}
                        dataType={selectedJoinPredicate.conditionDraft.dataType}
                        fields={selectedJoinPredicate.conditionRightOptions}
                        functions={selectedJoinPredicate.conditionFunctions}
                        literalDisabled={
                          selectedJoinPredicate.conditionDraft.left.kind === 'literal'
                        }
                        onChange={(right) =>
                          setPendingJoinCondition({
                            ...selectedJoinPredicate.conditionDraft!,
                            right,
                          })
                        }
                      />
                      {selectedJoinPredicate.additionalConditionCount === 0 ? null : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-pressed={selectedJoinPredicate.conditionDraft.groupWithPrevious}
                              onClick={() =>
                                setPendingJoinCondition({
                                  ...selectedJoinPredicate.conditionDraft!,
                                  groupWithPrevious:
                                    !selectedJoinPredicate.conditionDraft!.groupWithPrevious,
                                })
                              }
                              style={{
                                display: 'flex',
                                width: '100%',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 8,
                                border: `1px solid ${
                                  selectedJoinPredicate.conditionDraft.groupWithPrevious
                                    ? '#10b981'
                                    : border
                                }`,
                                borderRadius: 6,
                                background: selectedJoinPredicate.conditionDraft.groupWithPrevious
                                  ? '#064e3b'
                                  : panel,
                                padding: '7px 9px',
                                color: selectedJoinPredicate.conditionDraft.groupWithPrevious
                                  ? '#d1fae5'
                                  : muted,
                                cursor: 'pointer',
                                fontSize: 9,
                              }}
                            >
                              <Braces aria-hidden="true" size={12} />
                              Agrupar con la condición anterior
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Crea un grupo entre paréntesis con la condición anterior.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <button
                        type="button"
                        disabled={
                          selectedJoinPredicate.conditionLeftOperand == null ||
                          selectedJoinPredicate.conditionRightOperand == null
                        }
                        title="Añadir la comparación con el conector seleccionado."
                        onClick={() => {
                          const left = selectedJoinPredicate.conditionLeftOperand;
                          const right = selectedJoinPredicate.conditionRightOperand;
                          if (left == null || right == null) return;
                          addJoinCondition(
                            selectedJoinPredicate.joinRelationId,
                            left,
                            right,
                            selectedJoinPredicate.conditionDraft!.operator,
                            selectedJoinPredicate.conditionDraft!.combination,
                            selectedJoinPredicate.conditionDraft!.groupWithPrevious
                          );
                        }}
                        style={{
                          width: '100%',
                          marginTop: 7,
                          border: '1px solid #0f766e',
                          borderRadius: 6,
                          background:
                            selectedJoinPredicate.conditionRightOperand == null
                              ? '#111827'
                              : '#064e3b',
                          padding: '8px 9px',
                          color:
                            selectedJoinPredicate.conditionRightOperand == null
                              ? '#64748b'
                              : '#d1fae5',
                          cursor:
                            selectedJoinPredicate.conditionRightOperand == null
                              ? 'not-allowed'
                              : 'pointer',
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        {selectedJoinPredicate.conditionDraft.groupWithPrevious
                          ? `Añadir dentro de (…) con ${selectedJoinPredicate.conditionDraft.combination.toUpperCase()}`
                          : `Añadir con ${selectedJoinPredicate.conditionDraft.combination.toUpperCase()}`}
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
