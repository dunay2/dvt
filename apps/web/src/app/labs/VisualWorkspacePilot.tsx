/** Sprint UIREFRESH0: isolated frontend-only visual prototype. No domain or execution imports. */
import { useState } from 'react';
import { Background, Controls, MiniMap, ReactFlow, type Node, type Edge } from '@xyflow/react';
import './VisualWorkspacePilot.css';

export const VISUAL_REGIONS = ['header', 'palette', 'canvas', 'inspector', 'activity'] as const;
export const FUNCTIONAL_ZONES: Readonly<Record<string, readonly string[]>> = {
  navigation: ['header', 'palette'],
  authoring: ['palette', 'canvas', 'inspector'],
  observation: ['canvas', 'inspector', 'activity'],
};
const initialNodes: Node[] = [
  { id: 'client', position: { x: 75, y: 90 }, data: { label: '▦  client  ·  PostgreSQL' }, style: { borderColor: '#34d399' } },
  { id: 'orders', position: { x: 75, y: 300 }, data: { label: '▦  orders  ·  PostgreSQL' }, style: { borderColor: '#34d399' } },
  { id: 'join', position: { x: 410, y: 190 }, data: { label: '◇  Join clientes-órdenes' }, style: { borderColor: '#a855f7' } },
  { id: 'model', position: { x: 735, y: 190 }, data: { label: '▣  Model 1  ·  Output' }, style: { borderColor: '#38bdf8' } },
];
const edges: Edge[] = [
  { id: 'c-j', source: 'client', target: 'join', animated: false },
  { id: 'o-j', source: 'orders', target: 'join' },
  { id: 'j-m', source: 'join', target: 'model' },
];
export default function VisualWorkspacePilot() {
  const [nodes, setNodes] = useState(initialNodes);
  const [selected, setSelected] = useState('orders');
  const [palette, setPalette] = useState(true);
  const [inspector, setInspector] = useState(true);
  const [activity, setActivity] = useState(true);
  const [menu, setMenu] = useState(false);
  return <div className="visual-pilot">
    <header className="visual-pilot-header"><strong>DVT <span>Visual Lab</span></strong><nav><button className="active">Canvas</button><button onClick={() => setPalette(!palette)}>Elementos</button><button onClick={() => setInspector(!inspector)}>Inspector</button><button onClick={() => setActivity(!activity)}>Registro</button></nav><button onClick={() => setMenu(!menu)}>⋯ Menú</button>{menu && <div className="visual-pilot-menu"><button onClick={() => { setNodes(initialNodes); setMenu(false); }}>Restablecer posiciones</button><button onClick={() => setMenu(false)}>Cerrar</button></div>}</header>
    <main className="visual-pilot-main">
      {palette && <aside className="visual-pilot-side"><h3>ELEMENTOS <button onClick={() => setPalette(false)}>×</button></h3><p>Fuentes</p><div className="visual-pilot-item">▦ Tabla</div><div className="visual-pilot-item">▤ Consulta</div><p>Transformaciones</p><div className="visual-pilot-item">◇ Join</div><div className="visual-pilot-item">▽ Filtro</div><div className="visual-pilot-item">◫ Proyección</div><p>Salidas</p><div className="visual-pilot-item">▣ Tabla destino</div></aside>}
      <section className="visual-pilot-center"><div className="visual-pilot-graph"><ReactFlow nodes={nodes} edges={edges} onNodesChange={changes => setNodes(current => current.map(node => { const position = changes.find(change => change.type === 'position' && change.id === node.id); return position?.type === 'position' && position.position ? { ...node, position: position.position } : node; }))} onNodeClick={(_, node) => setSelected(node.id)} nodesConnectable={false} nodesDraggable fitView fitViewOptions={{ padding: 0.25 }}><Background color="#233654" gap={22} size={1}/><Controls/><MiniMap nodeColor="#5275ac" /></ReactFlow></div>{activity && <footer className="visual-pilot-activity"><div><strong>Registro</strong><button onClick={() => setActivity(false)}>×</button></div><p>● Laboratorio visual activo · sin conexión al backend</p><p>● Selecciona o mueve un nodo para probar la interfaz</p></footer>}</section>
      {inspector && <aside className="visual-pilot-side visual-pilot-inspector"><h3>PROPIEDADES <button onClick={() => setInspector(false)}>×</button></h3><h2>{selected}</h2><p>Resumen　 Columnas　 Entradas y salidas</p><div className="visual-pilot-item">Tipo · {selected === 'join' ? 'Transform' : selected === 'model' ? 'Sink' : 'Source'}</div><div className="visual-pilot-item">Modo · Solo visualización</div><div className="visual-pilot-item">Estado · Demostración</div></aside>}
    </main>
  </div>;
}
