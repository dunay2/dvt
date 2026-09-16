import { useMemo, useState, type ReactElement } from 'react';
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';

const surface = '#040712';
const panel = '#09111f';
const elevated = '#10192d';
const border = '#2f4368';
const text = '#e2e8f0';
const strong = '#f8fafc';
const muted = '#94a3b8';
const accent = '#7dd3fc';
const relation = '#c4b5fd';

type ScenarioId = 'pending' | 'join' | 'complex';

type SourceNodeData = Readonly<{
  label: string;
  relation: string;
  columns: number;
}>;

type TransformNodeData = Readonly<{
  label: string;
  columns: number;
}>;

type CompositionNodeData = Readonly<{
  badge: string;
  subtitle: string;
  active: boolean;
  onActivate: () => void;
}>;

type CompositionStep = Readonly<{
  label: string;
  detail: string;
}>;

type Scenario = Readonly<{
  id: ScenarioId;
  label: string;
  summary: string;
  badge: string;
  subtitle: string;
  steps: readonly CompositionStep[];
}>;

const SCENARIOS: readonly Scenario[] = [
  {
    id: 'pending',
    label: 'Pendiente',
    summary:
      'Tres relaciones están conectadas al Transform, pero todavía no existe operación relacional canónica.',
    badge: 'RELATE',
    subtitle: '3 inputs · operación pendiente',
    steps: [],
  },
  {
    id: 'join',
    label: 'JOIN simple',
    summary: 'La composición canónica contiene una única operación INNER JOIN.',
    badge: 'INNER JOIN',
    subtitle: 'orders.client_id = client.id',
    steps: [
      {
        label: 'INNER JOIN',
        detail: 'orders.client_id = client.id',
      },
    ],
  },
  {
    id: 'complex',
    label: 'Composición compleja',
    summary:
      'El mismo glyph representa una composición completa sin expandir la tarjeta del Transform.',
    badge: '4 OPS',
    subtitle: 'join · join · window · union',
    steps: [
      {
        label: 'INNER JOIN',
        detail: 'orders.client_id = client.id',
      },
      {
        label: 'LEFT JOIN',
        detail: 'result.product_id = products.id',
      },
      {
        label: 'WINDOW',
        detail: 'PARTITION BY client_id · ORDER BY created_at',
      },
      {
        label: 'UNION ALL',
        detail: 'result + archive_orders',
      },
    ],
  },
];

function LabCard(props: {
  children: ReactElement | ReactElement[];
  selected?: boolean;
}): ReactElement {
  return (
    <div
      style={{
        minWidth: 220,
        borderRadius: 10,
        border: `1px solid ${props.selected ? accent : border}`,
        background: panel,
        color: text,
        boxShadow: '0 16px 40px rgba(2, 6, 23, 0.32)',
        overflow: 'hidden',
      }}
    >
      {props.children}
    </div>
  );
}

function SourceNode({ data }: NodeProps<Node<SourceNodeData>>): ReactElement {
  return (
    <LabCard>
      <>
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${border}` }}>
          <div style={{ color: strong, fontWeight: 700, fontSize: 14 }}>◉ {data.label}</div>
          <div style={{ marginTop: 3, color: muted, fontSize: 11 }}>{data.relation}</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 16px 12px',
            color: muted,
            fontSize: 11,
          }}
        >
          <span>Columnas ({data.columns})</span>
          <span>Source</span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 12,
            height: 12,
            border: `2px solid ${relation}`,
            background: surface,
          }}
        />
      </>
    </LabCard>
  );
}

function TransformNode({ data }: NodeProps<Node<TransformNodeData>>): ReactElement {
  return (
    <LabCard>
      <>
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 12,
            height: 12,
            border: `2px solid ${accent}`,
            background: surface,
          }}
        />
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${border}` }}>
          <div style={{ color: strong, fontWeight: 700, fontSize: 14 }}>▦ {data.label}</div>
          <div style={{ marginTop: 3, color: muted, fontSize: 11 }}>Transform</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 16px 12px',
            color: muted,
            fontSize: 11,
          }}
        >
          <span>Columnas ({data.columns})</span>
          <span>En edición</span>
        </div>
      </>
    </LabCard>
  );
}

function CompositionNode({ data }: NodeProps<Node<CompositionNodeData>>): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: text,
      }}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Left}
        style={{ top: 8, opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="middle"
        type="target"
        position={Position.Left}
        style={{ top: 24, opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        id="bottom"
        type="target"
        position={Position.Left}
        style={{ top: 40, opacity: 0, pointerEvents: 'none' }}
      />
      <button
        type="button"
        aria-label="Abrir composición relacional"
        onClick={data.onActivate}
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          border: `1px solid ${data.active ? accent : relation}`,
          background: elevated,
          color: relation,
          fontSize: 26,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: data.active ? '0 0 0 3px rgba(125, 211, 252, 0.14)' : undefined,
        }}
      >
        ◇
      </button>
      <button
        type="button"
        onClick={data.onActivate}
        style={{
          display: 'grid',
          gap: 2,
          minWidth: 132,
          padding: '7px 12px',
          borderRadius: 999,
          border: `1px solid ${data.active ? accent : border}`,
          background: elevated,
          color: text,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: strong, fontSize: 11, fontWeight: 800, letterSpacing: '0.03em' }}>
          {data.badge}
        </span>
        <span style={{ color: muted, fontSize: 9 }}>{data.subtitle}</span>
      </button>
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  sourceLab: SourceNode,
  transformLab: TransformNode,
  compositionLab: CompositionNode,
};

function buildNodes(scenario: Scenario, active: boolean, onActivate: () => void): Node[] {
  return [
    {
      id: 'orders',
      type: 'sourceLab',
      position: { x: 70, y: 70 },
      data: { label: 'orders', relation: 'raw.orders', columns: 6 },
      draggable: true,
    },
    {
      id: 'client',
      type: 'sourceLab',
      position: { x: 70, y: 270 },
      data: { label: 'client', relation: 'raw.client', columns: 4 },
      draggable: true,
    },
    {
      id: 'products',
      type: 'sourceLab',
      position: { x: 70, y: 470 },
      data: { label: 'products', relation: 'raw.products', columns: 7 },
      draggable: true,
    },
    {
      id: 'composition',
      type: 'compositionLab',
      position: { x: 500, y: 275 },
      data: {
        badge: scenario.badge,
        subtitle: scenario.subtitle,
        active,
        onActivate,
      },
      draggable: true,
      selectable: false,
    },
    {
      id: 'transform',
      type: 'transformLab',
      position: { x: 850, y: 250 },
      data: { label: 'Orders + Client + Products', columns: scenario.id === 'pending' ? 6 : 10 },
      draggable: true,
    },
  ];
}

const EDGES: readonly Edge[] = [
  {
    id: 'orders-composition',
    source: 'orders',
    target: 'composition',
    targetHandle: 'top',
    type: 'smoothstep',
    style: { stroke: relation, strokeWidth: 2 },
  },
  {
    id: 'client-composition',
    source: 'client',
    target: 'composition',
    targetHandle: 'middle',
    type: 'smoothstep',
    style: { stroke: relation, strokeWidth: 2 },
  },
  {
    id: 'products-composition',
    source: 'products',
    target: 'composition',
    targetHandle: 'bottom',
    type: 'smoothstep',
    style: { stroke: relation, strokeWidth: 2 },
  },
  {
    id: 'composition-transform',
    source: 'composition',
    target: 'transform',
    type: 'smoothstep',
    style: { stroke: accent, strokeWidth: 2.3 },
  },
];

function RelationalCompositionLab(): ReactElement {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('join');
  const [compositionOpen, setCompositionOpen] = useState(false);
  const scenario = SCENARIOS.find((candidate) => candidate.id === scenarioId) ?? SCENARIOS[0]!;
  const nodes = useMemo(
    () => buildNodes(scenario, compositionOpen, () => setCompositionOpen((value) => !value)),
    [compositionOpen, scenario]
  );

  return (
    <main
      style={{
        height: '100vh',
        display: 'grid',
        gridTemplateRows: '72px minmax(0, 1fr)',
        background: surface,
        color: text,
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: '12px 22px',
          borderBottom: `1px solid ${border}`,
          background: panel,
        }}
      >
        <div>
          <div style={{ color: accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>
            RELATIONAL COMPOSITION LAB
          </div>
          <h1 style={{ margin: '4px 0 0', color: strong, fontSize: 19, fontWeight: 700 }}>
            Composition glyph + compact Transform
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SCENARIOS.map((candidate) => {
            const selected = candidate.id === scenario.id;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  setScenarioId(candidate.id);
                  setCompositionOpen(false);
                }}
                style={{
                  borderRadius: 7,
                  border: `1px solid ${selected ? accent : border}`,
                  background: selected ? '#17243c' : elevated,
                  color: selected ? strong : muted,
                  padding: '8px 11px',
                  fontSize: 11,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                {candidate.label}
              </button>
            );
          })}
        </div>
      </header>

      <section style={{ position: 'relative', minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={[...EDGES]}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.45}
          maxZoom={1.5}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="#1e293b" />
        </ReactFlow>

        <aside
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 310,
            borderRadius: 10,
            border: `1px solid ${border}`,
            background: 'rgba(9, 17, 31, 0.94)',
            boxShadow: '0 18px 55px rgba(2, 6, 23, 0.48)',
            padding: 16,
          }}
        >
          <div style={{ color: strong, fontSize: 12, fontWeight: 800 }}>{scenario.label}</div>
          <p style={{ margin: '7px 0 0', color: muted, fontSize: 11, lineHeight: 1.5 }}>
            {scenario.summary}
          </p>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${border}`,
              color: muted,
              fontSize: 10,
              lineHeight: 1.6,
            }}
          >
            Las ramas solo expresan inputs. El glyph es una proyección visual efímera de la
            composición canónica; no es un nodo persistido del Workspace Graph.
          </div>
        </aside>

        {compositionOpen ? (
          <section
            aria-label="Detalle de composición relacional"
            style={{
              position: 'absolute',
              left: '50%',
              top: 82,
              transform: 'translateX(-50%)',
              width: 390,
              maxHeight: 'calc(100% - 120px)',
              overflow: 'auto',
              borderRadius: 12,
              border: `1px solid ${accent}`,
              background: panel,
              boxShadow: '0 22px 65px rgba(2, 6, 23, 0.62)',
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 16px',
                borderBottom: `1px solid ${border}`,
              }}
            >
              <div>
                <div style={{ color: strong, fontSize: 13, fontWeight: 800 }}>
                  Composición relacional
                </div>
                <div style={{ marginTop: 3, color: muted, fontSize: 10 }}>{scenario.subtitle}</div>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle de composición"
                onClick={() => setCompositionOpen(false)}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: muted,
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {scenario.steps.length === 0 ? (
              <div style={{ padding: 16 }}>
                <div style={{ color: strong, fontSize: 12, fontWeight: 700 }}>
                  Operación pendiente
                </div>
                <p style={{ margin: '6px 0 0', color: muted, fontSize: 11, lineHeight: 1.5 }}>
                  Aquí se conectará el futuro selector de operaciones compatibles. Este laboratorio
                  no persiste semántica ni intenta decidir JOIN, UNION, EXISTS u otra operación.
                </p>
              </div>
            ) : (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {scenario.steps.map((step, index) => (
                  <li
                    key={`${step.label}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 1fr',
                      gap: 10,
                      padding: '12px 16px',
                      borderBottom:
                        index === scenario.steps.length - 1 ? undefined : `1px solid ${border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: `1px solid ${border}`,
                        color: accent,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ color: strong, fontSize: 11, fontWeight: 800 }}>
                        {step.label}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: muted,
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: 9,
                          lineHeight: 1.55,
                        }}
                      >
                        {step.detail}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 18,
            padding: '8px 10px',
            borderRadius: 7,
            border: `1px solid ${border}`,
            background: 'rgba(9, 17, 31, 0.9)',
            color: muted,
            fontSize: 10,
          }}
        >
          /lab/relational-composition · synthetic presentation only · no backend · no persistence
        </div>
      </section>
    </main>
  );
}

export default RelationalCompositionLab;
