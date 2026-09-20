/** Owned concern: contextual toolbar entry points for admitted Substrait operators. */
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useState } from 'react';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  resolveCanvasRelationalOperatorTools,
  type CanvasRelationalOperatorTool,
} from './canvasRelationalTreeOperatorModel';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

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
  const copy = resolveCanvasViewCopy(language);
  return (
    <div
      className="flex items-center gap-1 border-l border-(--border-subtle) pl-2"
      data-slot="canvas-relational-operator-tools"
    >
      {resolveCanvasRelationalOperatorTools(draft).map((tool) => {
        const presentation = resolveCanvasRelationalOperationPresentation(tool.id);
        const Icon = presentation.icon;
        const title = copy[presentation.labelKey];
        return (
          <button
            key={tool.id}
            type="button"
            data-operator-tool={tool.id}
            disabled={!editable || !tool.enabled}
            aria-label={title}
            title={
              tool.enabled
                ? title
                : es
                  ? 'No disponible para esta salida. Las ventanas sobre conjuntos requieren agrupar primero.'
                  : 'Unavailable for this output. Windows on sets require grouping first.'
            }
            onClick={() => setSelected(tool)}
            className="flex h-8 items-center gap-2 rounded px-2 text-sm font-medium text-(--text-strong) hover:bg-(--surface-selected) disabled:opacity-40"
          >
            <Icon className="size-4 text-(--status-info)" aria-hidden="true" />
            {title}
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
          title={copy[resolveCanvasRelationalOperationPresentation(selected.id).labelKey]}
          onClose={() => setSelected(null)}
          onChange={onChange}
        />
      )}
    </div>
  );
}
