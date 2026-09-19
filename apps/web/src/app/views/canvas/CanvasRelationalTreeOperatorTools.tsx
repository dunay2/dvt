/** Owned concern: contextual toolbar entry points for admitted Substrait operators. */
import { Filter, Sigma, ChartNoAxesCombined } from 'lucide-react';
import { useState } from 'react';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  resolveCanvasRelationalOperatorTools,
  type CanvasRelationalOperatorTool,
} from './canvasRelationalTreeOperatorModel';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

const icons = { filter: Filter, aggregate: Sigma, window: ChartNoAxesCombined };
export function CanvasRelationalTreeOperatorTools({
  draft,
  editable,
  onChange,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft | null;
  editable: boolean;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const es = language === 'es';
  const [selected, setSelected] = useState<CanvasRelationalOperatorTool | null>(null);
  if (draft == null) return null;
  const titles = {
    filter: es ? 'Filtrar' : 'Filter',
    aggregate: es ? 'Agrupar · COUNT' : 'Group · COUNT',
    window: es ? 'Ventana · ROW_NUMBER' : 'Window · ROW_NUMBER',
  };
  return (
    <div
      className="flex items-center gap-1 border-l border-(--border-subtle) pl-2"
      data-slot="canvas-relational-operator-tools"
    >
      {resolveCanvasRelationalOperatorTools(draft).map((tool) => {
        const Icon = icons[tool.id];
        return (
          <button
            key={tool.id}
            type="button"
            data-operator-tool={tool.id}
            disabled={!editable || !tool.enabled}
            aria-label={titles[tool.id]}
            title={
              tool.enabled
                ? titles[tool.id]
                : es
                  ? 'No disponible para esta salida. Las ventanas sobre conjuntos requieren agrupar primero.'
                  : 'Unavailable for this output. Windows on sets require grouping first.'
            }
            onClick={() => setSelected(tool)}
            className="flex h-8 items-center gap-2 rounded px-2 text-sm font-medium text-(--text-strong) hover:bg-(--surface-selected) disabled:opacity-40"
          >
            <Icon className="size-4 text-(--status-info)" aria-hidden="true" />
            {titles[tool.id]}
            {tool.active ? (
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
      {selected == null ? null : (
        <CanvasRelationalTreeOperatorForm
          tool={selected}
          draft={draft}
          title={titles[selected.id]}
          onClose={() => setSelected(null)}
          onChange={onChange}
        />
      )}
    </div>
  );
}
