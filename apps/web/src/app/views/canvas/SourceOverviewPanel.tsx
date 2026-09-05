/** Owned concern: render the approved data-first Source Overview without duplicating mutation authority. */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type {
  NodePropertiesReadModel,
  NodePropertyRowId,
} from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';

const SOURCE_OVERVIEW_COPY = {
  en: {
    sourceMetadata: 'Source metadata',
    readOnly: 'read-only',
    kind: 'Kind',
    tableKind: 'Table',
    schema: 'Schema',
    table: 'Table',
    columns: 'Columns',
    dvtMetadata: 'DVT metadata',
    name: 'Name',
    tags: 'Tags',
    description: 'Description',
    edit: 'Edit',
    addTag: 'Add tag',
    systemMetadata: 'System metadata',
    alias: 'Alias',
    derived: 'derived',
    empty: '—',
  },
  es: {
    sourceMetadata: 'Metadatos del origen',
    readOnly: 'solo lectura',
    kind: 'Tipo',
    tableKind: 'Tabla',
    schema: 'Esquema',
    table: 'Tabla',
    columns: 'Columnas',
    dvtMetadata: 'Metadatos DVT',
    name: 'Nombre',
    tags: 'Etiquetas',
    description: 'Descripción',
    edit: 'Editar',
    addTag: 'Añadir etiqueta',
    systemMetadata: 'Metadatos del sistema',
    alias: 'Alias',
    derived: 'derivado',
    empty: '—',
  },
} as const;

type EditableField = 'name' | 'tags' | 'description' | null;

type SourceOverviewPanelProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  readModel: NodePropertiesReadModel;
  authoring: CanvasInspectorAuthoringContract;
  draftController: CanvasNodeWorkbenchDraftController;
}>;

function readRowValue(
  model: NodePropertiesReadModel,
  sectionId: string,
  rowId: NodePropertyRowId
): string | null {
  return (
    model.sections
      .find((section) => section.id === sectionId)
      ?.rows.find((row) => row.id === rowId)?.value ?? null
  );
}

function ExternalFact({
  label,
  value,
}: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <div className="contents">
      <dt className={inspectorVisualClasses.inspectorLabel}>{label}</dt>
      <dd className="min-w-0 break-words text-(--text-primary)">{value}</dd>
    </div>
  );
}

function visibleBusinessTags(tagsText: string): readonly string[] {
  return tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function SourceOverviewPanel({
  node,
  nodes,
  edges,
  readModel,
  authoring,
  draftController,
}: SourceOverviewPanelProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = applicationLanguage.trim().toLowerCase().startsWith('es')
    ? SOURCE_OVERVIEW_COPY.es
    : SOURCE_OVERVIEW_COPY.en;
  const [editingField, setEditingField] = useState<EditableField>(null);
  const skipNextBlurCommit = useRef(false);
  const draft = draftController.draft;
  const generalSection = readModel.sections.find((section) => section.id === 'general');
  const columnsSection = readModel.sections.find((section) => section.id === 'columns');
  const schema = readRowValue(readModel, 'general', 'schema') ?? copy.empty;
  const table = readRowValue(readModel, 'general', 'table') ?? copy.empty;
  const kind = table === copy.empty ? node.kind : copy.tableKind;
  const columnCount = String(columnsSection?.tableRows.length ?? 0);
  const alias = draft.dvt?.kind === 'source' ? draft.dvt.alias : '';
  const businessTags = visibleBusinessTags(draftController.tagsText);
  const errors = useMemo(
    () =>
      validateCanvasInspectorNodeDraft(draft, {
        node,
        nodes,
        edges,
        workspaceScope: authoring.workspaceScope,
      }),
    [authoring.workspaceScope, draft, edges, node, nodes]
  );

  const commitCurrentDraft = (): void => {
    if (skipNextBlurCommit.current) {
      skipNextBlurCommit.current = false;
      return;
    }
    if (!authoring.canEditNode) {
      setEditingField(null);
      return;
    }
    if (!hasCanvasInspectorNodeDraftChanges(node, draft)) {
      setEditingField(null);
      return;
    }
    if (Object.keys(errors).length > 0) return;
    authoring.onApplyNodeDraft(draft);
    draftController.onDraftSubmitted(draft);
    setEditingField(null);
  };

  const cancelFieldEdit = (field: Exclude<EditableField, null>): void => {
    skipNextBlurCommit.current = true;
    if (field === 'name') {
      draftController.onDraftChange((current) => ({ ...current, name: node.name }));
    } else if (field === 'description') {
      draftController.onDraftChange((current) => ({
        ...current,
        description: node.description ?? '',
      }));
    } else {
      draftController.onResetDraft();
    }
    setEditingField(null);
  };

  const handleSingleLineKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    field: 'name' | 'tags'
  ): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelFieldEdit(field);
      event.currentTarget.blur();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const hasGeneralFacts = generalSection != null;

  return (
    <div
      data-slot="canvas-source-overview"
      className="grid min-w-0 grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] divide-x divide-(--border-subtle) overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-panel)"
    >
      <section data-slot="canvas-source-overview-external" className="min-w-0 space-y-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{copy.sourceMetadata}</h3>
          <span className="text-xs text-(--status-readonly)">{copy.readOnly}</span>
        </div>

        <dl className="grid grid-cols-[minmax(72px,0.38fr)_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
          <ExternalFact label={copy.kind} value={kind} />
          <ExternalFact label={copy.schema} value={schema} />
          <ExternalFact label={copy.table} value={table} />
          <ExternalFact label={copy.columns} value={columnCount} />
        </dl>

        {!hasGeneralFacts ? (
          <p className={inspectorVisualClasses.inspectorSubtle}>{copy.empty}</p>
        ) : null}
      </section>

      <section data-slot="canvas-source-overview-dvt" className="min-w-0 space-y-6 p-4">
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{copy.dvtMetadata}</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className={inspectorVisualClasses.inspectorLabel}>{copy.name}</span>
            {authoring.canEditNode && editingField !== 'name' ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingField('name')}>
                {copy.edit}
              </Button>
            ) : null}
          </div>
          {editingField === 'name' ? (
            <Input
              autoFocus
              aria-label={copy.name}
              value={draft.name}
              aria-invalid={errors.name ? 'true' : undefined}
              onChange={(event) =>
                draftController.onDraftChange((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              onKeyDown={(event) => handleSingleLineKeyDown(event, 'name')}
              onBlur={commitCurrentDraft}
            />
          ) : (
            <p className="text-sm font-medium text-(--text-primary)">{draft.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className={inspectorVisualClasses.inspectorLabel}>{copy.tags}</span>
            {authoring.canEditNode && editingField !== 'tags' ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingField('tags')}>
                {copy.addTag}
              </Button>
            ) : null}
          </div>
          {editingField === 'tags' ? (
            <Input
              autoFocus
              aria-label={copy.tags}
              value={draftController.tagsText}
              onChange={(event) => draftController.onTagsTextChange(event.target.value)}
              onKeyDown={(event) => handleSingleLineKeyDown(event, 'tags')}
              onBlur={commitCurrentDraft}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {businessTags.length > 0 ? (
                businessTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className={inspectorVisualClasses.inspectorSubtle}>{copy.empty}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className={inspectorVisualClasses.inspectorLabel}>{copy.description}</span>
            {authoring.canEditNode && editingField !== 'description' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingField('description')}
              >
                {copy.edit}
              </Button>
            ) : null}
          </div>
          {editingField === 'description' ? (
            <Textarea
              autoFocus
              aria-label={copy.description}
              value={draft.description}
              onChange={(event) =>
                draftController.onDraftChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelFieldEdit('description');
                  event.currentTarget.blur();
                }
              }}
              onBlur={commitCurrentDraft}
            />
          ) : (
            <p className={inspectorVisualClasses.inspectorBody}>{draft.description || copy.empty}</p>
          )}
        </div>

        {alias ? (
          <details className="rounded-lg border border-(--border-subtle) bg-(--surface-elevated)">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-(--text-primary)">
              {copy.systemMetadata}
            </summary>
            <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 pb-3 text-xs">
              <dt className={inspectorVisualClasses.inspectorLabel}>{copy.alias}</dt>
              <dd className="min-w-0 break-all font-mono text-(--text-primary)">
                {alias}{' '}
                <span className={inspectorVisualClasses.inspectorSubtle}>· {copy.derived}</span>
              </dd>
            </dl>
          </details>
        ) : null}
      </section>
    </div>
  );
}
