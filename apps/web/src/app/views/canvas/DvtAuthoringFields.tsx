/** Owned concern: route DVT Inspector sections to focused authoring components. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { resolveInheritedDvtConnectionRef } from './canvasDvtAuthoringModel';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtTransformResultTargetFields } from './DvtTransformResultTargetFields';
import { resolveDvtResultTargetConnection } from './canvasDvtResultTargetConnection';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtSubstraitCompositionStart } from './DvtSubstraitCompositionStart';
import { DvtRelationAuthoringSection } from './DvtRelationAuthoringSection';
import { DvtSubstraitTransformStart } from './DvtSubstraitTransformStart';
import { DvtTransformMaterializationField } from './DvtTransformMaterializationField';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  section?: 'all' | 'general' | 'columns' | 'code';
  relationalPredicateSeed?: CanvasRelationalPredicateSeed;
  onClearRelationalPredicateSeed?: () => void;
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

function formatQualifiedTarget(parts: readonly string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('.');
}

export function DvtAuthoringFields({
  node,
  nodes = [node],
  edges = [],
  disabled,
  draft,
  errors,
  section = 'all',
  relationalPredicateSeed,
  onClearRelationalPredicateSeed,
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
    const predicateSeed =
      relationalPredicateSeed?.targetNodeId === node.id ? relationalPredicateSeed : undefined;
    const materializationField = (
      <div className="space-y-4">
        <DvtTransformMaterializationField
          disabled={disabled}
          draft={draft.dvt}
          errors={errors.dvt}
          onChange={onChange}
        />
        <DvtTransformResultTargetFields
          target={draft.dvt.resultTarget}
          connection={resolveDvtResultTargetConnection({ node, nodes, edges })}
          disabled={disabled}
          errors={errors.dvt}
          onChange={(resultTarget) =>
            onChange((current) =>
              current.dvt?.kind === 'transform'
                ? { ...current, dvt: { ...current.dvt, resultTarget } }
                : current
            )
          }
        />
      </div>
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
          predicateSeed={predicateSeed}
          onClearPredicateSeed={onClearRelationalPredicateSeed}
          onChange={onChange}
        />
      );
    } else if (draft.dvt.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      semanticFields = null;
    } else {
      semanticFields = (
        <div className="space-y-4">
          {draft.dvt.shape === 'projection' ? (
            <DvtSubstraitCompositionStart
              disabled={disabled}
              node={node}
              nodes={nodes}
              edges={edges}
              predicateSeed={predicateSeed}
              onClearPredicateSeed={onClearRelationalPredicateSeed}
              onChange={onChange}
            />
          ) : null}
          <DvtRelationAuthoringSection
            nodeId={node.id}
            disabled={disabled}
            draft={draft.dvt}
            outputNameDrafts={draft.outputNameDrafts}
            onChange={onChange}
          />
        </div>
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
