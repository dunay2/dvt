/**
 * Owned concern: present JOIN formula actions without compiling or saving expressions.
 * @baseline GH-3612: formula controls reuse the existing editor and stylesheet.
 * @decision Keep accessible markup separate from command and draft ownership.
 * @consequence No inline styling or alternate semantic state is introduced.
 * @version 1.0.0
 */
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import './derivedOutputFormula.css';

export function CanvasJoinPredicateFormulaTemplate(
  props: Readonly<{
    copy: CanvasSemanticEditorCopy['joinFormula'];
    editing: boolean;
    busy: boolean;
    editDisabled: boolean;
    saveDisabled: boolean;
    error: string | null;
    editor: ReactNode;
    children: ReactNode;
    onEdit: () => void;
    onCancel: () => void;
    onSubmit: () => void;
  }>
) {
  if (!props.editing)
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-slot="join-predicate-formula-open"
          disabled={props.editDisabled}
          onClick={props.onEdit}
        >
          {props.copy.edit}
        </Button>
        {props.children}
      </>
    );
  return (
    <form
      className="formula-form"
      data-slot="join-predicate-formula"
      aria-busy={props.busy}
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <p className="formula-save-reason">{props.copy.hint}</p>
      {props.editor}
      <div className="formula-actions">
        <p className="formula-save-reason" role={props.error == null ? 'status' : 'alert'}>
          {props.error}
        </p>
        <div className="formula-action-buttons">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={props.busy}
            onClick={props.onCancel}
          >
            {props.copy.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={props.saveDisabled}>
            {props.copy.save}
          </Button>
        </div>
      </div>
    </form>
  );
}
