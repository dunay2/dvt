/** Owned concern: capture the canonical output alias before applying one field function. */
import { useId, useState, type ReactElement } from 'react';

import { Input } from '../../components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/ui/popover';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';

export function GraphNodeColumnFunctionAliasForm(props: {
  functionName: string;
  unavailableAliases: readonly string[];
  copy: GraphNodeColumnCopy;
  onSubmit: (alias: string) => void;
  onCancel: () => void;
}): ReactElement {
  const [alias, setAlias] = useState('');
  const [aliasConflict, setAliasConflict] = useState(false);
  const inputId = useId();
  const normalizedAlias = alias.trim();

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) props.onCancel();
      }}
    >
      <PopoverAnchor asChild>
        <span className={graphNodeColumnClasses.functionAliasAnchor} />
      </PopoverAnchor>
      <PopoverContent
        data-slot="graph-node-column-function-alias-form"
        side="right"
        align="center"
        className={graphNodeColumnClasses.functionAliasForm}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (normalizedAlias.length === 0) return;
            if (props.unavailableAliases.includes(normalizedAlias)) {
              setAliasConflict(true);
              return;
            }
            props.onSubmit(normalizedAlias);
          }}
        >
          <label htmlFor={inputId} className={graphNodeColumnClasses.functionAliasLabel}>
            {props.copy.columnFunctionAliasLabelTemplate.replace(
              '{function}',
              props.functionName.toUpperCase()
            )}
          </label>
          <Input
            id={inputId}
            data-slot="graph-node-column-function-alias-input"
            value={alias}
            autoFocus
            required
            aria-invalid={aliasConflict}
            onChange={(event) => {
              setAlias(event.currentTarget.value);
              setAliasConflict(false);
            }}
          />
          {aliasConflict ? (
            <p role="alert" className={graphNodeColumnClasses.functionAliasError}>
              {props.copy.columnFunctionAliasConflictLabel}
            </p>
          ) : null}
          <div className={graphNodeColumnClasses.functionAliasActions}>
            <button
              type="button"
              className={graphNodeColumnClasses.functionAliasCancel}
              onClick={props.onCancel}
            >
              {props.copy.columnFunctionAliasCancelLabel}
            </button>
            <button
              type="submit"
              data-slot="graph-node-column-function-alias-submit"
              disabled={normalizedAlias.length === 0}
              className={graphNodeColumnClasses.functionAliasSubmit}
            >
              {props.copy.columnFunctionAliasSubmitLabel}
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
