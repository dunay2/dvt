import { useCallback, useMemo, useState } from 'react';
import { Background, ReactFlow, type EdgeTypes, type NodeTypes } from '@xyflow/react';
import { Braces, Database, Equal, GitMerge, Hash } from 'lucide-react';

import DbtNodeComponent from '../components/canvas/DbtNodeComponent';
import { OperationalDrawerDataTable } from '../components/shell/OperationalDrawerDataTable';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { CanvasDependencyEdge } from '../views/canvas/CanvasDependencyEdge';
import { useCanvasViewportGraphModel } from '../views/canvas/useCanvasViewportGraphModel';
import {
  SEMANTIC_WORKBENCH_EDGE,
  SEMANTIC_WORKBENCH_SOURCE,
  SEMANTIC_WORKBENCH_TRANSFORM,
} from './semanticWorkbenchFixture';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

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
  const [selectedSemanticId, setSelectedSemanticId] = useState(semanticGraph.relationId);
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
  const selectedSemantic =
    semanticGraph.nodes.find((node) => node.id === selectedSemanticId) ??
    semanticGraph.nodes.find((node) => node.data.semanticKind !== 'group') ??
    null;
  const semanticNodes = useMemo(
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

        const [title, subtitle = ''] = node.data.label.split('\n');
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
            nodes={semanticNodes}
            edges={semanticGraph.edges}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
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
                Proyección semántica de solo lectura. La edición debe usar el rail DVT existente.
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
    </main>
  );
}

export default SemanticWorkbenchLab;
