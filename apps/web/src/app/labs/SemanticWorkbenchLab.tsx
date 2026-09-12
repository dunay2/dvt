import { useCallback, useMemo, useState } from 'react';
import { Background, ReactFlow, type EdgeTypes, type NodeTypes } from '@xyflow/react';

import DbtNodeComponent, { type DbtNodeData } from '../components/canvas/DbtNodeComponent';
import { OperationalDrawerDataTable } from '../components/shell/OperationalDrawerDataTable';
import { dvtCanvasSurfaceStrategy } from '../plugins/dvt/dvtCanvasSurfaceStrategy';
import type {
  GraphNodeColumn,
  GraphNodeColumnOutputToggleIdentity,
} from '../plugins/graph/graphNodeColumnContracts';
import { getRegisteredPluginIds } from '../plugins/registry';
import { CanvasDependencyEdge } from '../views/canvas/CanvasDependencyEdge';
import { CanvasNodeWorkbenchOverlay } from '../views/canvas/CanvasNodeWorkbenchOverlay';
import { SemanticTransformFocusPanel } from '../views/canvas/SemanticTransformFocusPanel';
import type { CanvasInspectorAuthoringContract } from '../views/canvas/canvasInspectorAuthoring.types';
import {
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  setDvtSubstraitJoinConnectionFieldSelected,
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

const surface = '#040712';
const panel = '#09111f';
const border = '#263b5c';
const text = '#e2e8f0';
const muted = '#94a3b8';
const accent = '#7dd3fc';
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
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(
    SEMANTIC_WORKBENCH_EDGE[0]?.id ?? null
  );
  const [selectedSourceSampleId, setSelectedSourceSampleId] = useState<string | null>(null);
  const [workbenchRequest, setWorkbenchRequest] = useState<WorkbenchRequest | null>(null);
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
    },
    [selectedConnectionId]
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
              : { onToggleCanvasColumnOutput: toggleConnectionColumn }),
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

      <div style={{ gridRow: '3 / 5', minHeight: 0, overflow: 'hidden' }}>
        {selectedSourceSample == null ? (
          <SemanticTransformFocusPanel
            transform={fixture.transform}
            canEdit
            onTransformChange={(transform) => setFixture((current) => ({ ...current, transform }))}
          />
        ) : (
          <section
            data-slot="semantic-workbench-source-sample"
            style={{
              height: '100%',
              minWidth: 0,
              overflow: 'auto',
              background: '#05090f',
              padding: 18,
            }}
          >
            <div style={{ marginBottom: 14, color: accent, fontSize: 11, fontWeight: 700 }}>
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
                (selectedSourceSample.nodeId === fixture.transform.id
                  ? 'Output sample from '
                  : 'Data sample from ') + selectedSourceSample.nodeName
              }
              columns={selectedSourceSample.columns}
              rows={selectedSourceSample.rows}
              nullValueLabel="NULL"
            />
          </section>
        )}
      </div>

      <CanvasNodeWorkbenchOverlay
        layout={workbenchLayout}
        panels={workbenchPanels}
        onHide={closeWorkbench}
      />
    </main>
  );
}

export default SemanticWorkbenchLab;
