/** Owned concern: render the route-owned Inspector authoring surface for governed node details. */
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';

type CanvasInspectorAuthoringSectionProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  authoring: CanvasInspectorAuthoringContract;
}>;

export function CanvasInspectorAuthoringSection({
  node,
  nodes,
  edges,
  authoring,
}: CanvasInspectorAuthoringSectionProps) {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));

  useEffect(() => {
    setDraft(createCanvasInspectorNodeDraft(node));
  }, [node.description, node.id, node.metadata, node.name]);

  const errors = useMemo(() => validateCanvasInspectorNodeDraft(draft), [draft]);
  const isDirty = useMemo(() => hasCanvasInspectorNodeDraftChanges(node, draft), [draft, node]);
  const canApply = authoring.canEditNode && isDirty && Object.keys(errors).length === 0;

  return (
    <Card className={graphVisualClasses.inspectorCard}>
      <div className="space-y-3">
        <div>
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Node details</h3>
          <p className={graphVisualClasses.inspectorBody}>
            Name and description saved with this canvas.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`inspector-node-name-${node.id}`}>Name</Label>
          <Input
            id={`inspector-node-name-${node.id}`}
            name="node-name"
            value={draft.name}
            disabled={!authoring.canEditNode}
            aria-invalid={errors.name ? 'true' : undefined}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                name: event.target.value,
              }))
            }
          />
          {errors.name ? (
            <p className={graphVisualClasses.inspectorErrorText}>{errors.name}</p>
          ) : null}
        </div>

        {draft.dbt ? (
          <DbtAuthoringFields
            node={node}
            nodes={nodes}
            edges={edges}
            disabled={!authoring.canEditNode}
            draft={draft}
            errors={errors}
            onChange={setDraft}
          />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`inspector-node-description-${node.id}`}>Description</Label>
          <Textarea
            id={`inspector-node-description-${node.id}`}
            name="node-description"
            value={draft.description}
            disabled={!authoring.canEditNode}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                description: event.target.value,
              }))
            }
          />
        </div>

        {!authoring.canEditNode ? (
          <p className={graphVisualClasses.inspectorBody}>
            Node details are read-only for this workspace state.
          </p>
        ) : null}

        {authoring.canEditNode && isDirty ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft(createCanvasInspectorNodeDraft(node))}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canApply}
              onClick={() => {
                if (!canApply) {
                  return;
                }
                authoring.onApplyNodeDraft(draft);
              }}
            >
              Apply
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

type DbtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

function buildDbtOriginOptions(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): Array<Readonly<{ value: string; label: string }>> {
  const nodeById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  return args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter(
      (candidate): candidate is CanonicalNode =>
        candidate?.pluginId === 'dbt' &&
        (candidate.kind === 'dbt:source' || candidate.kind === 'dbt:model')
    )
    .map((candidate) => ({
      value: candidate.id,
      label: `${candidate.name} (${candidate.kind.replace('dbt:', '')})`,
    }));
}

function DbtAuthoringFields({
  node,
  nodes,
  edges,
  disabled,
  draft,
  errors,
  onChange,
}: DbtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dbt) {
    return null;
  }

  const originOptions = buildDbtOriginOptions({ node, nodes, edges });
  const selectedSourceId = draft.dbt.selectedSourceId || originOptions[0]?.value || '';
  const selectClassName = graphVisualClasses.inspectorSelectInput;

  return (
    <div className={graphVisualClasses.inspectorDbtSection}>
      <h3 className={graphVisualClasses.contextPanelSectionTitle}>dbt card</h3>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-package-${node.id}`}>Package</Label>
        <Input
          id={`inspector-dbt-package-${node.id}`}
          name="dbt-package"
          value={draft.dbt.packageName}
          disabled={disabled}
          aria-invalid={errors.dbt?.packageName ? 'true' : undefined}
          onChange={(event) =>
            onChange((currentDraft) => ({
              ...currentDraft,
              dbt: currentDraft.dbt
                ? { ...currentDraft.dbt, packageName: event.target.value }
                : undefined,
            }))
          }
        />
        {errors.dbt?.packageName ? (
          <p className={graphVisualClasses.inspectorErrorText}>{errors.dbt.packageName}</p>
        ) : null}
      </div>

      {node.kind === 'dbt:source' ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-source-${node.id}`}>Source</Label>
            <Input
              id={`inspector-dbt-source-${node.id}`}
              name="dbt-source"
              value={draft.dbt.sourceName}
              disabled={disabled}
              aria-invalid={errors.dbt?.sourceName ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  dbt: currentDraft.dbt
                    ? { ...currentDraft.dbt, sourceName: event.target.value }
                    : undefined,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-schema-${node.id}`}>Schema</Label>
            <Input
              id={`inspector-dbt-schema-${node.id}`}
              name="dbt-schema"
              value={draft.dbt.schemaName}
              disabled={disabled}
              aria-invalid={errors.dbt?.schemaName ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  dbt: currentDraft.dbt
                    ? { ...currentDraft.dbt, schemaName: event.target.value }
                    : undefined,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-table-${node.id}`}>Table</Label>
            <Input
              id={`inspector-dbt-table-${node.id}`}
              name="dbt-table"
              value={draft.dbt.tableName}
              disabled={disabled}
              aria-invalid={errors.dbt?.tableName ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  dbt: currentDraft.dbt
                    ? { ...currentDraft.dbt, tableName: event.target.value }
                    : undefined,
                }))
              }
            />
          </div>
        </div>
      ) : null}

      {node.kind === 'dbt:model' ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-materialized-${node.id}`}>Materialized</Label>
            <select
              id={`inspector-dbt-materialized-${node.id}`}
              name="dbt-materialized"
              value={draft.dbt.materialized}
              disabled={disabled}
              className={selectClassName}
              aria-invalid={errors.dbt?.materialized ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  dbt: currentDraft.dbt
                    ? { ...currentDraft.dbt, materialized: event.target.value }
                    : undefined,
                }))
              }
            >
              <option value="view">view</option>
              <option value="table">table</option>
              <option value="incremental">incremental</option>
              <option value="ephemeral">ephemeral</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-origin-${node.id}`}>Origin</Label>
            {originOptions.length > 0 ? (
              <select
                id={`inspector-dbt-origin-${node.id}`}
                name="dbt-origin"
                value={selectedSourceId}
                disabled={disabled}
                className={selectClassName}
                onChange={(event) =>
                  onChange((currentDraft) => ({
                    ...currentDraft,
                    dbt: currentDraft.dbt
                      ? { ...currentDraft.dbt, selectedSourceId: event.target.value }
                      : undefined,
                  }))
                }
              >
                {originOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className={graphVisualClasses.inspectorBody}>No connected dbt origins.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
