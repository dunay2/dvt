/** Searchable operands and admitted function signatures; insertion is a draft-only gesture. */
import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { Input } from '../../components/ui/input';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { FormulaSuggestion } from './canvasFormulaAssist';
import type { DerivedOutputFormulaDragScope } from './DerivedOutputFormulaForm';
import { writeCanvasRelationalFieldDrag } from './canvasRelationalTreeDrag';
import './derivedOutputFormula.css';

export function DerivedOutputFormulaPalette({
  suggestions,
  dragScope,
  copy,
  disabled,
  onInsert,
}: Readonly<{
  suggestions: readonly FormulaSuggestion[];
  dragScope: DerivedOutputFormulaDragScope;
  copy: CanvasSemanticEditorCopy['derivedOutput'];
  disabled: boolean;
  onInsert: (suggestion: FormulaSuggestion) => void;
}>): JSX.Element {
  const [group, setGroup] = useState<'field' | 'function'>('field');
  const [search, setSearch] = useState('');
  const visible = suggestions.filter(
    (item) =>
      item.kind === group && item.label.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  return (
    <section className="formula-palette" aria-label={copy.availableFields}>
      <div className="formula-palette-tabs">
        {(['field', 'function'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={group === kind}
            onClick={() => setGroup(kind)}
          >
            {kind === 'field' ? copy.availableFields : copy.functions}
          </button>
        ))}
      </div>
      <Input
        type="search"
        value={search}
        aria-label={copy.search}
        placeholder={copy.search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul className="formula-palette-items">
        {visible.map((item) => (
          <li key={`${item.kind}/${item.label}`}>
            <button
              type="button"
              disabled={disabled}
              className="formula-palette-item"
              data-slot="formula-operand"
              data-kind={item.kind}
              title={item.detail}
              draggable={!disabled && item.kind === 'field'}
              onDragStart={(event) => {
                event.stopPropagation();
                const reference = dragScope.references.find(
                  (field) => field.fieldId === item.fieldId
                );
                if (disabled || reference == null) {
                  event.preventDefault();
                  return;
                }
                writeCanvasRelationalFieldDrag(event.dataTransfer, {
                  ...reference,
                  rootId: dragScope.rootId,
                  revision: dragScope.revision,
                });
              }}
              onClick={() => onInsert(item)}
            >
              {item.kind === 'field' ? (
                <GripVertical size={12} aria-hidden="true" />
              ) : (
                <span aria-hidden="true">ƒ</span>
              )}
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </button>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="formula-muted">{copy.noMatches}</p> : null}
    </section>
  );
}
