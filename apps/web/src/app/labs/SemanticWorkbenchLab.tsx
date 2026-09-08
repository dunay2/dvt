import { useMemo, useState } from 'react';
import { Background, MiniMap, ReactFlow, type Node } from '@xyflow/react';

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

function SemanticWorkbenchLab() {
  const graph = useMemo(
    () => projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM),
    []
  );
  const [selected, setSelected] = useState<Node<SemanticWorkbenchNodeData> | null>(null);
  const sourceColumns = Array.isArray(SEMANTIC_WORKBENCH_SOURCE.metadata?.columns)
    ? SEMANTIC_WORKBENCH_SOURCE.metadata.columns.length
    : 0;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: surface,
        color: text,
        fontFamily: 'IBM Plex Sans, sans-serif',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
      }}
    >
      <header
        style={{
          minHeight: 74,
          borderBottom: `1px solid ${border}`,
          background: panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: '14px 24px',
        }}
      >
        <div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
            SEMANTIC WORKBENCH LAB
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 650 }}>
            DVT semantic document → visual tree
          </h1>
        </div>
        <div
          style={{
            color: muted,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            textAlign: 'right',
            lineHeight: 1.55,
          }}
        >
          localhost:5174/lab/semantic-workbench
          <br />
          local only · no backend · no CI
        </div>
      </header>

      <section
        style={{
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '250px minmax(0, 1fr) 270px',
        }}
      >
        <aside
          style={{
            borderRight: `1px solid ${border}`,
            background: '#07101e',
            padding: 18,
          }}
        >
          <div style={{ color: muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em' }}>
            REAL DVT OBJECTS
          </div>
          <div style={{ marginTop: 18, fontSize: 13, fontWeight: 650 }}>Source</div>
          <div style={{ marginTop: 5, color: accent, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
            {SEMANTIC_WORKBENCH_SOURCE.name}
          </div>
          <div style={{ marginTop: 4, color: muted, fontSize: 11 }}>
            {sourceColumns} columns · PostgreSQL
          </div>

          <div style={{ marginTop: 22, fontSize: 13, fontWeight: 650 }}>Transform</div>
          <div style={{ marginTop: 5, color: accent, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
            {SEMANTIC_WORKBENCH_TRANSFORM.name}
          </div>
          <div style={{ marginTop: 4, color: muted, fontSize: 11 }}>
            canonical node + VTX2/Substrait authority
          </div>

          <div style={{ marginTop: 22, fontSize: 13, fontWeight: 650 }}>Dependency</div>
          <div style={{ marginTop: 5, color: muted, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
            {SEMANTIC_WORKBENCH_EDGE.sourceId}
            <br />→ {SEMANTIC_WORKBENCH_EDGE.targetId}
          </div>

          <div
            style={{
              marginTop: 26,
              paddingTop: 16,
              borderTop: `1px solid ${border}`,
              color: muted,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            The lab does not invent a pipeline model. It projects the semantic authority already attached to the DVT Transform.
          </div>
        </aside>

        <div style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.25}
            maxZoom={1.8}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => setSelected(node)}
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
              top: 16,
              left: 18,
              border: `1px solid ${border}`,
              borderRadius: 8,
              background: 'rgba(7, 16, 30, 0.92)',
              padding: '9px 12px',
              color: muted,
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              pointerEvents: 'none',
            }}
          >
            {graph.relationCount} relations · {graph.expressionCount} expression nodes
          </div>
        </div>

        <aside
          style={{
            borderLeft: `1px solid ${border}`,
            background: '#05090f',
            padding: 18,
          }}
        >
          <div style={{ color: muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em' }}>
            SELECTION
          </div>
          {selected == null ? (
            <p style={{ marginTop: 18, color: muted, fontSize: 12, lineHeight: 1.6 }}>
              Select a relation, field, literal or function in the graph. Selection is local presentation state only.
            </p>
          ) : (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: accent, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
                {selected.data.label}
              </div>
              <div style={{ marginTop: 9, color: muted, fontSize: 11 }}>
                semantic kind: {selected.data.semanticKind}
              </div>
              <div style={{ marginTop: 5, color: muted, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
                node: {selected.id}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: `1px solid ${border}`,
              color: muted,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            First validation target: does the left→right projection make precedence and relation flow obvious before we add editing?
          </div>
        </aside>
      </section>
    </main>
  );
}

export default SemanticWorkbenchLab;
