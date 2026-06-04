/** Owned concern: render DVT-specific Canvas Inspector authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

export function DvtAuthoringFields({
  node,
  disabled,
  draft,
  errors,
  onChange,
}: DvtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dvt) {
    return null;
  }

  const selectClassName = graphVisualClasses.inspectorSelectInput;

  if (draft.dvt.kind === 'source') {
    return (
      <div className={graphVisualClasses.inspectorDbtSection}>
        <h3 className={graphVisualClasses.contextPanelSectionTitle}>DVT source</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-schema-${node.id}`}>Schema</Label>
            <Input
              id={`inspector-dvt-source-schema-${node.id}`}
              name="dvt-source-schema"
              value={draft.dvt.schema}
              disabled={disabled}
              aria-invalid={errors.dvt?.schema ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, schema: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors.dvt?.schema ? (
              <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.schema}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-table-${node.id}`}>Table</Label>
            <Input
              id={`inspector-dvt-source-table-${node.id}`}
              name="dvt-source-table"
              value={draft.dvt.table}
              disabled={disabled}
              aria-invalid={errors.dvt?.table ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, table: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors.dvt?.table ? (
              <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.table}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-alias-${node.id}`}>Alias</Label>
            <Input
              id={`inspector-dvt-source-alias-${node.id}`}
              name="dvt-source-alias"
              value={draft.dvt.alias}
              disabled={disabled}
              aria-invalid={errors.dvt?.alias ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, alias: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors.dvt?.alias ? (
              <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.alias}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (draft.dvt.kind === 'sql_transform') {
    return (
      <div className={graphVisualClasses.inspectorDbtSection}>
        <h3 className={graphVisualClasses.contextPanelSectionTitle}>DVT SQL transform</h3>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-transform-sql-${node.id}`}>SQL</Label>
          <Textarea
            id={`inspector-dvt-transform-sql-${node.id}`}
            name="dvt-transform-sql"
            value={draft.dvt.sql}
            disabled={disabled}
            aria-invalid={errors.dvt?.sql ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sql_transform'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, sql: event.target.value },
                    }
                  : currentDraft
              )
            }
          />
          {errors.dvt?.sql ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.sql}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={graphVisualClasses.inspectorDbtSection}>
      <h3 className={graphVisualClasses.contextPanelSectionTitle}>DVT sink</h3>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-schema-${node.id}`}>Schema</Label>
          <Input
            id={`inspector-dvt-sink-schema-${node.id}`}
            name="dvt-sink-schema"
            value={draft.dvt.schema}
            disabled={disabled}
            aria-invalid={errors.dvt?.schema ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, schema: event.target.value },
                    }
                  : currentDraft
              )
            }
          />
          {errors.dvt?.schema ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.schema}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-table-${node.id}`}>Table</Label>
          <Input
            id={`inspector-dvt-sink-table-${node.id}`}
            name="dvt-sink-table"
            value={draft.dvt.table}
            disabled={disabled}
            aria-invalid={errors.dvt?.table ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, table: event.target.value },
                    }
                  : currentDraft
              )
            }
          />
          {errors.dvt?.table ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.table}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-materialization-${node.id}`}>Materialization</Label>
          <select
            id={`inspector-dvt-sink-materialization-${node.id}`}
            name="dvt-sink-materialization"
            value={draft.dvt.materialization}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors.dvt?.materialization ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, materialization: event.target.value },
                    }
                  : currentDraft
              )
            }
          >
            <option value="table">table</option>
            <option value="view">view</option>
          </select>
          {errors.dvt?.materialization ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.materialization}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-sink-write-mode-${node.id}`}>Write mode</Label>
          <select
            id={`inspector-dvt-sink-write-mode-${node.id}`}
            name="dvt-sink-write-mode"
            value={draft.dvt.writeMode}
            disabled={disabled}
            className={selectClassName}
            aria-invalid={errors.dvt?.writeMode ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'sink'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, writeMode: event.target.value },
                    }
                  : currentDraft
              )
            }
          >
            <option value="replace">replace</option>
            <option value="append">append</option>
          </select>
          {errors.dvt?.writeMode ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.dvt.writeMode}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
