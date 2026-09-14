/** Owned concern: present read-only output expression inspection in the existing semantic drawer. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Background, ReactFlow } from '@xyflow/react';
import type { CanonicalNode } from '../../types/canonical';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { projectCanvasOutputExpression } from './canvasOutputExpressionProjection';
import { projectSemanticWorkbenchNodes } from './semanticWorkbenchGraphNodes';

const COPY = {
  es: {
    title: 'Expresión de salida',
    close: 'Volver al flujo relacional',
    readonly: 'Solo lectura',
    unavailable: 'No se puede representar esta salida en el visor de expresiones escalares.',
    selected: 'Nodo seleccionado',
    outputType: 'Tipo de salida',
  },
  en: {
    title: 'Output expression',
    close: 'Back to relational flow',
    readonly: 'Read only',
    unavailable: 'This output cannot be represented in the scalar expression viewer.',
    selected: 'Selected node',
    outputType: 'Output type',
  },
};

export function SemanticOutputExpressionPanel({
  transform,
  fieldId,
  onClose,
}: {
  transform: CanonicalNode;
  fieldId: string;
  onClose: () => void;
}) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = COPY[language];
  const closeRef = useRef<HTMLButtonElement>(null);
  const projection = useMemo(
    () => projectCanvasOutputExpression(transform, fieldId),
    [transform, fieldId]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    projection.status === 'available'
      ? (projection.graph.nodes.find((node) => node.id === selectedId) ?? projection.graph.nodes[0])
      : undefined;
  const nodes = useMemo(
    () =>
      projection.status === 'available'
        ? projectSemanticWorkbenchNodes(projection.graph, selected?.id ?? null, setSelectedId)
        : [],
    [projection, selected?.id]
  );
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [fieldId, transform.id]);
  return (
    <section
      data-slot="semantic-output-expression"
      data-field-id={fieldId}
      className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-200"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-2 text-xs">
        <strong>
          {copy.title} · {projection.status === 'available' ? projection.alias : transform.name}
        </strong>
        <span>{copy.readonly}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded border border-slate-600 px-3 py-1 focus-visible:outline focus-visible:outline-sky-400"
        >
          {copy.close}
        </button>
      </header>
      {projection.status === 'unavailable' ? (
        <p role="status" className="p-4 text-sm">
          {copy.unavailable}
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-0 min-w-0">
            <ReactFlow
              nodes={nodes}
              edges={projection.graph.edges}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.15}
              maxZoom={1.6}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              zoomOnDoubleClick={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#182844" gap={24} size={1} />
            </ReactFlow>
          </div>
          <aside className="min-h-0 overflow-auto border-l border-slate-700 p-4 text-xs">
            <strong>{copy.selected}</strong>
            <pre
              data-slot="semantic-output-expression-detail"
              className="mt-3 whitespace-pre-wrap break-words font-mono text-sky-300"
            >
              {selected?.data.detail}
            </pre>
            <div className="mt-4 text-slate-400">
              {copy.outputType}: {projection.dataType}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
