/**
 * Owned concern: compose Source Overview facts and wire existing draft editing.
 * @baseline Inspector presentation consumes the current read model and authoring authority.
 * @decision Reuse shared property templates and the metadata CSS module.
 * @consequence Layout is independent of permissions, draft validation and commit semantics.
 * @version 1.0.0
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { SourceObjectSchema } from '@dvt/contracts';

import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { InspectorPropertyField } from '../../components/inspector/InspectorPropertyField';
import { NodePropertyFacts } from '../../components/inspector/NodePropertyFacts';
import styles from '../../components/inspector/InspectorMetadata.module.css';
import type {
  NodePropertiesReadModel,
  NodePropertyRowId,
} from '../../components/inspector/nodePropertiesContracts';
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
    sourceComment: 'Database comment',
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
    sourceComment: 'Comentario de la base de datos',
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
    model.sections.find((section) => section.id === sectionId)?.rows.find((row) => row.id === rowId)
      ?.value ?? null
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
  const sourceComment = SourceObjectSchema.shape.comment.safeParse(node.metadata?.sourceComment);

  return (
    <div
      data-slot="canvas-source-overview"
      className={`${inspectorVisualClasses.inspectorForm} ${styles.panel}`}
    >
      <section data-slot="canvas-source-overview-external" className={styles.section}>
        <div className={styles.header}>
          <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{copy.sourceMetadata}</h3>
          <span className={styles.readOnly}>{copy.readOnly}</span>
        </div>

        <NodePropertyFacts
          layout="compact"
          rows={[
            { label: copy.kind, value: kind },
            { label: copy.schema, value: schema },
            { label: copy.table, value: table },
            { label: copy.columns, value: columnCount },
          ]}
        />
        <div className={styles.comment}>
          <h4 className={inspectorVisualClasses.inspectorLabel}>{copy.sourceComment}</h4>
          <p data-slot="source-table-comment" className={styles.text}>
            {sourceComment.success ? (sourceComment.data ?? copy.empty) : copy.empty}
          </p>
        </div>

        {!hasGeneralFacts ? (
          <p className={inspectorVisualClasses.inspectorSubtle}>{copy.empty}</p>
        ) : null}
      </section>

      <section data-slot="canvas-source-overview-dvt" className={styles.section}>
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{copy.dvtMetadata}</h3>

        <InspectorPropertyField
          slot="source-dvt-name"
          label={copy.name}
          action={
            authoring.canEditNode && editingField !== 'name'
              ? { label: copy.edit, onSelect: () => setEditingField('name') }
              : null
          }
        >
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
            <p className={styles.name}>{draft.name}</p>
          )}
        </InspectorPropertyField>

        <InspectorPropertyField
          label={copy.tags}
          action={
            authoring.canEditNode && editingField !== 'tags'
              ? { label: copy.addTag, onSelect: () => setEditingField('tags') }
              : null
          }
        >
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
            <div className={styles.tags}>
              {businessTags.length > 0 ? (
                businessTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className={inspectorVisualClasses.inspectorSubtle}>{copy.empty}</span>
              )}
            </div>
          )}
        </InspectorPropertyField>

        <InspectorPropertyField
          label={copy.description}
          layout="block"
          action={
            authoring.canEditNode && editingField !== 'description'
              ? { label: copy.edit, onSelect: () => setEditingField('description') }
              : null
          }
        >
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
            <p className={styles.text}>{draft.description || copy.empty}</p>
          )}
        </InspectorPropertyField>

        {alias ? (
          <details className={styles.disclosure}>
            <summary className={styles.summary}>{copy.systemMetadata}</summary>
            <NodePropertyFacts
              layout="compact"
              rows={[
                {
                  label: copy.alias,
                  value: (
                    <span className={styles.identifier}>
                      {alias}{' '}
                      <span className={inspectorVisualClasses.inspectorSubtle}>
                        · {copy.derived}
                      </span>
                    </span>
                  ),
                },
              ]}
            />
          </details>
        ) : null}
      </section>
    </div>
  );
}
