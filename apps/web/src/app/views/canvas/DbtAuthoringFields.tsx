/** Owned concern: render dbt-specific Canvas Inspector authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { canvasViewCopy } from './copy';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

type DbtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

type DbtOriginNode = CanonicalNode & Readonly<{ kind: 'dbt:source' | 'dbt:model' }>;

function isDbtOriginNode(candidate: CanonicalNode | undefined): candidate is DbtOriginNode {
  return (
    candidate?.pluginId === 'dbt' &&
    (candidate.kind === 'dbt:source' || candidate.kind === 'dbt:model')
  );
}

function buildDbtOriginOptions(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  kindLabels: Readonly<Record<'dbt:source' | 'dbt:model', string>>;
}): Array<Readonly<{ value: string; label: string }>> {
  const nodeById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  return args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter(isDbtOriginNode)
    .map((candidate) => ({
      value: candidate.id,
      label: `${candidate.name} (${args.kindLabels[candidate.kind]})`,
    }));
}

function normalizeDbtIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

function resolveDbtModelOrigin(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedOriginId: string;
}): CanonicalNode | null {
  const nodeById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  const incomingOrigins = args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter(isDbtOriginNode);

  return (
    incomingOrigins.find((candidate) => candidate.id === args.selectedOriginId) ??
    incomingOrigins.find((candidate) => candidate.kind === 'dbt:source') ??
    incomingOrigins[0] ??
    null
  );
}

function buildGeneratedDbtModelSqlPreview(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedOriginId: string;
}): string | null {
  const origin = resolveDbtModelOrigin(args);
  if (origin == null) {
    return null;
  }

  if (origin.kind === 'dbt:source') {
    const sourceMetadata = createDbtNodeAuthoringMetadata(origin);
    return [
      'select *',
      `from {{ source('${sourceMetadata.sourceName}', '${sourceMetadata.tableName}') }}`,
    ].join('\n');
  }

  return ['select *', `from {{ ref('${normalizeDbtIdentifier(origin.name, origin.id)}') }}`].join(
    '\n'
  );
}

export function DbtAuthoringFields({
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

  const originOptions = buildDbtOriginOptions({
    node,
    nodes,
    edges,
    kindLabels: {
      'dbt:source': canvasViewCopy.inspectorDbtOriginKindSourceLabel,
      'dbt:model': canvasViewCopy.inspectorDbtOriginKindModelLabel,
    },
  });
  const selectedSourceId = draft.dbt.selectedSourceId || originOptions[0]?.value || '';
  const selectClassName = graphVisualClasses.inspectorSelectInput;
  const materializedOptions = [
    { value: 'view', label: canvasViewCopy.inspectorDbtMaterializedViewLabel },
    { value: 'table', label: canvasViewCopy.inspectorDbtMaterializedTableLabel },
    { value: 'incremental', label: canvasViewCopy.inspectorDbtMaterializedIncrementalLabel },
    { value: 'ephemeral', label: canvasViewCopy.inspectorDbtMaterializedEphemeralLabel },
  ] as const;
  const generatedModelSql =
    node.kind === 'dbt:model'
      ? buildGeneratedDbtModelSqlPreview({
          node,
          nodes,
          edges,
          selectedOriginId: selectedSourceId,
        })
      : null;

  return (
    <div className={graphVisualClasses.inspectorDbtSection}>
      <h3 className={graphVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDbtCardTitle}
      </h3>

      <div className="space-y-2">
        <Label htmlFor={`inspector-dbt-package-${node.id}`}>
          {canvasViewCopy.inspectorDbtPackageLabel}
        </Label>
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
          <p className={graphVisualClasses.inspectorErrorText}>
            {formatCanvasInspectorNodeDraftError(errors.dbt.packageName, canvasViewCopy)}
          </p>
        ) : null}
      </div>

      {node.kind === 'dbt:source' ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-source-${node.id}`}>
              {canvasViewCopy.inspectorDbtSourceLabel}
            </Label>
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
            {errors.dbt?.sourceName ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dbt.sourceName, canvasViewCopy)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-schema-${node.id}`}>
              {canvasViewCopy.inspectorDbtSchemaLabel}
            </Label>
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
            {errors.dbt?.schemaName ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dbt.schemaName, canvasViewCopy)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-table-${node.id}`}>
              {canvasViewCopy.inspectorDbtTableLabel}
            </Label>
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
            {errors.dbt?.tableName ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dbt.tableName, canvasViewCopy)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {node.kind === 'dbt:model' ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-materialized-${node.id}`}>
              {canvasViewCopy.inspectorDbtMaterializedLabel}
            </Label>
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
              {materializedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.dbt?.materialized ? (
              <p className={graphVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.dbt.materialized, canvasViewCopy)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-origin-${node.id}`}>
              {canvasViewCopy.inspectorDbtOriginLabel}
            </Label>
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
              <p className={graphVisualClasses.inspectorBody}>
                {canvasViewCopy.inspectorDbtNoConnectedOriginsMessage}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inspector-dbt-generated-sql-${node.id}`}>
              {canvasViewCopy.inspectorDbtGeneratedSqlLabel}
            </Label>
            {generatedModelSql ? (
              <pre
                id={`inspector-dbt-generated-sql-${node.id}`}
                data-slot="dbt-generated-model-sql"
                className="min-h-16 overflow-auto rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-xs leading-5 text-slate-100"
              >
                {generatedModelSql}
              </pre>
            ) : (
              <p className={graphVisualClasses.inspectorBody}>
                {canvasViewCopy.inspectorDbtGeneratedSqlUnavailableMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
