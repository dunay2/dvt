/** Owned concern: route DVT Inspector sections to focused authoring components. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import {
  resolveInheritedDvtConnectionRef,
  type DvtSubstraitTransformAuthoringMetadata,
  type DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import { resolveDvtSubstraitJoinAppendCandidates } from './canvasDvtSubstraitJoinComposition';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtRelationFilterAuthoringSection } from './DvtRelationFilterAuthoringSection';
import { DvtSubstraitCompositionStart } from './DvtSubstraitCompositionStart';
import { DvtSubstraitInnerJoinAuthoringSection } from './DvtSubstraitInnerJoinAuthoringSection';
import { DvtSubstraitPilotAuthoringSection } from './DvtSubstraitPilotAuthoringSection';
import { DvtSubstraitTransformStart } from './DvtSubstraitTransformStart';
import { DvtSubstraitUnionAllAuthoringSection } from './DvtSubstraitUnionAllAuthoringSection';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  section?: 'all' | 'general' | 'columns' | 'code';
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

function formatQualifiedTarget(parts: readonly string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('.');
}

type DvtTransformAuthoringMetadata =
  DvtUninitializedTransformAuthoringMetadata | DvtSubstraitTransformAuthoringMetadata;

function DvtTransformMaterializationField({
  disabled,
  draft,
  errors,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtTransformAuthoringMetadata;
  errors: DvtAuthoringFieldsProps['errors']['dvt'];
  onChange: DvtAuthoringFieldsProps['onChange'];
}>): JSX.Element {
  const options = [
    { value: 'view', label: canvasViewCopy.inspectorDvtMaterializationViewLabel },
    { value: 'table', label: canvasViewCopy.inspectorDvtMaterializationTableLabel },
  ] as const;

  return (
    <div className="space-y-2">
      <Label htmlFor="dvt-transform-materialization">
        {canvasViewCopy.inspectorDvtMaterializationLabel}
      </Label>
      <select
        id="dvt-transform-materialization"
        name="dvt-transform-materialization"
        value={draft.materialized}
        disabled={disabled}
        className={inspectorVisualClasses.inspectorSelectInput}
        aria-invalid={errors?.materialization ? 'true' : undefined}
        aria-describedby={
          errors?.materialization ? 'dvt-transform-materialization-error' : undefined
        }
        onChange={(event) =>
          onChange((current) =>
            current.dvt?.kind === 'transform'
              ? { ...current, dvt: { ...current.dvt, materialized: event.target.value } }
              : current
          )
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors?.materialization ? (
        <p
          id="dvt-transform-materialization-error"
          className={inspectorVisualClasses.inspectorErrorText}
          role="alert"
        >
          {formatCanvasInspectorNodeDraftError(errors.materialization, canvasViewCopy)}
        </p>
      ) : null}
    </div>
  );
}

export function DvtAuthoringFields({
  node,
  nodes = [node],
  edges = [],
  disabled,
  draft,
  errors,
  section = 'all',
  onChange,
}: DvtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dvt) return null;

  if (draft.dvt.kind === 'source') {
    return section === 'all' || section === 'general' ? (
      <DvtSourceAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        sourceTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table]) || '-'}
        onChange={onChange}
      />
    ) : null;
  }

  if (draft.dvt.kind === 'transform') {
    const materializationField = (
      <DvtTransformMaterializationField
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        onChange={onChange}
      />
    );
    if (section === 'general') return materializationField;

    let semanticFields: JSX.Element | null;
    if (draft.dvt.mode === 'uninitialized') {
      semanticFields = (
        <DvtSubstraitTransformStart
          disabled={disabled}
          node={node}
          nodes={nodes}
          edges={edges}
          onChange={onChange}
        />
      );
    } else if (draft.dvt.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      semanticFields = null;
    } else if (draft.dvt.shape === 'projection') {
      semanticFields = (
        <div className="space-y-4">
          <DvtRelationFilterAuthoringSection
            disabled={disabled}
            draft={draft.dvt}
            node={node}
            nodes={nodes}
            edges={edges}
            onChange={(semantic) =>
              onChange((current) =>
                current.dvt?.kind === 'transform' && current.dvt.mode === 'substrait'
                  ? { ...current, dvt: { ...current.dvt, ...semantic } }
                  : current
              )
            }
          />
          <DvtSubstraitCompositionStart
            disabled={disabled}
            node={node}
            nodes={nodes}
            edges={edges}
            onChange={onChange}
          />
        </div>
      );
    } else if (draft.dvt.shape === 'inner_join') {
      semanticFields = (
        <DvtSubstraitInnerJoinAuthoringSection
          disabled={disabled}
          draft={draft.dvt}
          appendCandidates={resolveDvtSubstraitJoinAppendCandidates({
            targetNode: node,
            nodes,
            edges,
            draft: { plan: draft.dvt.plan, sidecar: draft.dvt.sidecar },
          })}
          onChange={onChange}
          outputNameDrafts={draft.outputNameDrafts ?? {}}
        />
      );
    } else if (draft.dvt.shape === 'union_all') {
      semanticFields = (
        <DvtSubstraitUnionAllAuthoringSection
          disabled={disabled}
          draft={draft.dvt}
          onChange={onChange}
          outputNameDrafts={draft.outputNameDrafts ?? {}}
        />
      );
    } else {
      semanticFields = (
        <DvtSubstraitPilotAuthoringSection
          disabled={disabled}
          draft={draft.dvt}
          onChange={onChange}
        />
      );
    }

    return section === 'all' ? (
      <div className="space-y-4">
        {materializationField}
        {semanticFields}
      </div>
    ) : (
      semanticFields
    );
  }

  if (section !== 'all' && section !== 'general') return null;
  const inheritedConnectionRef = resolveInheritedDvtConnectionRef({ node, nodes, edges });
  return (
    <DvtSinkAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dvt}
      errors={errors.dvt}
      destinationTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table]) || '-'}
      inheritedConnectionId={inheritedConnectionRef?.connectionId}
      onChange={onChange}
    />
  );
}
