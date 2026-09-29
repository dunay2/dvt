/** Coordinate local editor gestures; the formula string remains the only draft authority. */
import { useEffect, useId, useRef, useState } from 'react';
import {
  MonacoCodeEditor,
  type MonacoCodeEditorMount,
} from '../../components/monaco/MonacoCodeEditor';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { FormulaSuggestion } from './canvasFormulaAssist';
import type { DerivedOutputFormulaDragScope } from './DerivedOutputFormulaForm';
import { DerivedOutputFormulaPalette } from './DerivedOutputFormulaPalette';
import { configureFormulaEditor } from './canvasFormulaMonaco';
import {
  CANVAS_RELATIONAL_FIELD_DRAG_TYPE,
  readCanvasRelationalFieldDrag,
} from './canvasRelationalTreeDrag';

export function DerivedOutputFormulaEditor({
  formula,
  suggestions,
  dragScope,
  copy,
  disabled,
  diagnostic,
  onChange,
  onInvalidDrop,
}: Readonly<{
  formula: string;
  suggestions: readonly FormulaSuggestion[];
  dragScope: DerivedOutputFormulaDragScope;
  copy: CanvasSemanticEditorCopy['derivedOutput'];
  disabled: boolean;
  diagnostic?: string;
  onChange: (formula: string) => void;
  onInvalidDrop: () => void;
}>): JSX.Element {
  const id = useId();
  const [ready, setReady] = useState(false);
  const editor = useRef<Parameters<MonacoCodeEditorMount>[0] | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      cleanup.current?.();
      editor.current = null;
    },
    []
  );
  const insert = (item: FormulaSuggestion) => {
    const current = editor.current;
    const model = current?.getModel();
    const range = current?.getSelection();
    if (disabled || current == null || model == null || range == null) return;
    const start = model.getOffsetAt(range.getStartPosition());
    const selected = model.getValueInRange(range);
    const template =
      item.template ??
      `${item.text}({column}${', '.repeat(Math.max(0, (item.argumentCount ?? 1) - 1))})`;
    const text = item.kind === 'function' ? template.replace('{column}', selected) : item.text;
    current.pushUndoStop();
    current.executeEdits('formula-insert', [{ range, text, forceMoveMarkers: true }]);
    current.setPosition(
      model.getPositionAt(
        start +
          (item.kind === 'function' ? template.indexOf('{column}') + selected.length : text.length)
      )
    );
    current.pushUndoStop();
    current.focus();
  };
  return (
    <div className="formula-workspace">
      <DerivedOutputFormulaPalette
        suggestions={suggestions}
        dragScope={dragScope}
        copy={copy}
        disabled={disabled || !ready}
        onInsert={insert}
      />
      <div className="formula-editor-heading">
        <span>{copy.formulaLabel}</span>
        <small>{copy.completionHint}</small>
      </div>
      <div
        data-slot="formula-editor"
        onDragOver={(event) => {
          if (disabled || !event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE))
            return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDropCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled) return;
          const reference = readCanvasRelationalFieldDrag(event.dataTransfer);
          const field =
            reference?.rootId === dragScope.rootId && reference.revision === dragScope.revision
              ? dragScope.references.find(
                  (item) =>
                    item.fieldId === reference.fieldId && item.relationId === reference.relationId
                )
              : undefined;
          const suggestion =
            field == null
              ? undefined
              : suggestions.find((item) => item.kind === 'field' && item.label === field.name);
          if (suggestion == null) {
            onInvalidDrop();
            return;
          }
          insert(suggestion);
        }}
      >
        <MonacoCodeEditor
          ariaLabel={copy.formulaLabel}
          loadingLabel={copy.loadingEditor}
          containerClassName="formula-code-surface"
          language="dvt-formula"
          path={`inmemory://dvt/formula/${encodeURIComponent(id)}`}
          value={formula}
          readOnly={disabled}
          onChange={onChange}
          diagnostics={
            diagnostic == null
              ? []
              : [{ message: diagnostic, startOffset: 0, endOffset: formula.length }]
          }
          onMount={(instance, monaco) => {
            cleanup.current?.();
            editor.current = instance;
            cleanup.current = configureFormulaEditor(instance, monaco, suggestions);
            setReady(true);
          }}
        />
      </div>
      <div className="formula-tools" aria-label={copy.constantsAndOperators}>
        {suggestions
          .filter((item) => item.kind === 'literal')
          .map((item) => (
            <button
              type="button"
              key={item.text}
              disabled={disabled || !ready}
              onClick={() => insert(item)}
              title={item.text === "''" ? copy.emptyText : undefined}
            >
              {item.text === "''" ? copy.emptyText : item.label}
            </button>
          ))}
        {[' + ', ' - ', ' * ', ' / ', '(', ')'].map((text) => (
          <button
            type="button"
            key={text}
            disabled={disabled || !ready}
            onClick={() => insert({ kind: 'literal', label: text, text, detail: '' })}
          >
            {text.trim()}
          </button>
        ))}
      </div>
    </div>
  );
}
