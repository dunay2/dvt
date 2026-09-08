import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from '@xyflow/react';

import DbtNodeComponent from '../components/canvas/DbtNodeComponent';
import { OperationalDrawerDataTable } from '../components/shell/OperationalDrawerDataTable';
import { CanvasDependencyEdge } from '../views/canvas/CanvasDependencyEdge';
import { useCanvasViewportGraphModel } from '../views/canvas/useCanvasViewportGraphModel';
import {
  SEMANTIC_WORKBENCH_EDGE,
  SEMANTIC_WORKBENCH_SOURCE,
  SEMANTIC_WORKBENCH_TRANSFORM,
} from './semanticWorkbenchFixture';
import {
  projectSemanticWorkbenchGraph,
  type SemanticWorkbenchNodeData,
} from './semanticWorkbenchProjection';

const surface = '#040712';
const panel = '#09111f';
const border = '#263b5c';
const text = '#e2e8f0';
const muted = '#94a3b8';
const accent = '#7dd3fc';

const DVT_NODE_TYPES: NodeTypes = { dbtNode: DbtNodeComponent };
const DVT_EDGE_TYPES: EdgeTypes = { dependency: CanvasDependencyEdge };

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

function buildCanvasProcess() {
  const canonicalNodes = [...SEMANTIC_WORKBENCH_SOURCE, SEMANTIC_WORKBENCH_TRANSFORM] as const;
  const canonicalEdges = SEMANTIC_WORKBENCH_EDGE;
  return {
    visibleNodeIds: canonicalNodes.map((node) => node.id),
    visibleEdges: canonicalEdges.map(({ sourceId, targetId }) => ({ sourceId, targetId })),
    canonicalNodesById: new Map(canonicalNodes.map((node) => [node.id, node])),
    canonicalEdgeIdBySignature: new Map(
      canonicalEdges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge.id])
    ),
    canonicalEdgeBySignature: new Map(
      canonicalEdges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge])
    ),
    columnLevelLineageEnabled: true,
    persistedNodePositions: {
      [canonicalNodes[0].id]: { x: 50, y: 72 },
      [canonicalNodes[1].id]: { x: 500, y: 72 },
      [canonicalNodes[2].id]: { x: 950, y: 72 },
    },
  };
}

function SemanticWorkbenchLab() {
  const canvasProjection = useMemo(buildCanvasProcess, []);
  const canvasProcess = useCanvasViewportGraphModel(canvasProjection);
  const semanticGraph = useMemo(
    () => projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM),
    []
  );
  const [selectedCanvasId, setSelectedCanvasId] = useState(SEMANTIC_WORKBENCH_TRANSFORM.id);
  const [selectedSemantic, setSelectedSemantic] = useState<Node<SemanticWorkbenchNodeData> | null>(
    null
  );
  const [selectedSourceSampleId, setSelectedSourceSampleId] = useState<string | null>(null);
  const openSourceDataSample = useCallback((nodeId: string) => {
    setSelectedSourceSampleId(nodeId);
  }, []);
  const canvasNodes = useMemo(
    () =>
      canvasProcess.nodes.map((node) =>
        SEMANTIC_WORKBENCH_SOURCE_SAMPLE_IDS.has(node.id)
          ? {
              ...node,
              data: {
                ...node.data,
                onOpenSourceDataSample: openSourceDataSample,
              },
            }
          : node
      ),
    [canvasProcess.nodes, openSourceDataSample]
  );
  const selectedSourceSample =
    SEMANTIC_WORKBENCH_SOURCE_SAMPLES.find(({ nodeId }) => nodeId === selectedSourceSampleId) ??
    null;

  const selectedCanvasNode =
    [...SEMANTIC_WORKBENCH_SOURCE, SEMANTIC_WORKBENCH_TRANSFORM].find(
      (node) => node.id === selectedCanvasId
    ) ?? SEMANTIC_WORKBENCH_TRANSFORM;

  return (
    <main
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: surface,
        color: text,
        fontFamily: 'IBM Plex Sans, sans-serif',
        display: 'grid',
        gridTemplateRows: '72px minmax(310px, 42vh) 42px minmax(0, 1fr)',
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
          edges={canvasProcess.edges}
          onNodesChange={canvasProcess.onNodesChange}
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
            if (node.id === SEMANTIC_WORKBENCH_TRANSFORM.id) {
              setSelectedSourceSampleId(null);
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
          selected: {selectedCanvasNode.name}
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
          TRANSFORM FOCUS · {SEMANTIC_WORKBENCH_TRANSFORM.name}
        </div>
        <div style={{ color: muted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
          semantic authority projection · relations + expressions · left → right
        </div>
      </div>

      <section
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 255px',
          position: 'relative',
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
              SOURCE DATA - {selectedSourceSample.nodeName}
              <span style={{ marginLeft: 12, color: muted, fontWeight: 400 }}>
                {selectedSourceSample.rows.length} JSON rows
              </span>
            </div>
            <OperationalDrawerDataTable
              key={selectedSourceSample.nodeId}
              caption={`Data sample from ${selectedSourceSample.nodeName}`}
              columns={selectedSourceSample.columns}
              rows={selectedSourceSample.rows}
              nullValueLabel="NULL"
            />
          </div>
        )}
        <div style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
          <ReactFlow
            nodes={semanticGraph.nodes}
            edges={semanticGraph.edges}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => setSelectedSemantic(node)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#182844" gap={24} size={1} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) =>
                node.data?.semanticKind === 'relation'
                  ? '#4f8cff'
                  : node.data?.semanticKind === 'field'
                    ? '#7dd3fc'
                    : '#7084a5'
              }
              maskColor="rgba(4, 7, 18, 0.72)"
              style={{ background: '#07101e', border: `1px solid ${border}` }}
            />
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
            {semanticGraph.relationCount} semantic relations · {semanticGraph.expressionCount}{' '}
            expression nodes
          </div>
        </div>

        <aside
          style={{
            borderLeft: `1px solid ${border}`,
            background: '#05090f',
            padding: 16,
          }}
        >
          <div style={{ color: muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em' }}>
            SEMANTIC SELECTION
          </div>
          {selectedSemantic == null ? (
            <p style={{ marginTop: 16, color: muted, fontSize: 11, lineHeight: 1.55 }}>
              Select a relation, field, literal or function inside the Transform focus.
            </p>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  color: accent,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-line',
                }}
              >
                {selectedSemantic.data.label}
              </div>
              <div style={{ marginTop: 9, color: muted, fontSize: 11 }}>
                kind: {selectedSemantic.data.semanticKind}
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: muted,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                }}
              >
                node: {selectedSemantic.id}
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
            Top level is the DVT Canvas. This lower graph is only the internal semantic focus of the
            selected Transform; it is not another set of DVT cards.
          </div>
        </aside>
      </section>
    </main>
  );
}

export default SemanticWorkbenchLab;
