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
  const groups =
    group === 'field'
      ? (['input', 'calculated'] as const).map((origin) => ({
          origin,
          label: origin === 'input' ? copy.inputFields : copy.calculatedFields,
          items: visible.filter((item) => (item.origin ?? 'input') === origin),
        }))
      : [{ origin: 'function', label: copy.functions, items: visible }];
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
      <div className="formula-palette-groups">
        {groups
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <section
              key={section.origin}
              data-slot={`formula-${section.origin}-fields`}
              aria-label={section.label}
            >
              {group === 'field' ? (
                <h4 className="formula-palette-group-heading">{section.label}</h4>
              ) : null}
              <ul className="formula-palette-items">
                {section.items.map((item) => (
                  <li key={`${item.kind}/${item.fieldId ?? item.label}`}>
                    <button
                      type="button"
                      disabled={disabled}
                      className="formula-palette-item"
                      data-slot="formula-operand"
                      data-kind={item.kind}
                      data-origin={item.origin}
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
            </section>
          ))}
      </div>
      {visible.length === 0 ? <p className="formula-muted">{copy.noMatches}</p> : null}
    </section>
  );
}
