/** Owned concern: route DVT Inspector sections to focused authoring components. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { resolveInheritedDvtConnectionRef } from './canvasDvtAuthoringModel';
import { resolveDvtSubstraitJoinAppendCandidates } from './canvasDvtSubstraitJoinComposition';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtRelationFilterAuthoringSection } from './DvtRelationFilterAuthoringSection';
import { DvtSubstraitCompositionStart } from './DvtSubstraitCompositionStart';
import { DvtSubstraitInnerJoinAuthoringSection } from './DvtSubstraitInnerJoinAuthoringSection';
import { DvtSubstraitPilotAuthoringSection } from './DvtSubstraitPilotAuthoringSection';
import { DvtSubstraitTransformStart } from './DvtSubstraitTransformStart';
import { DvtSubstraitUnionAllAuthoringSection } from './DvtSubstraitUnionAllAuthoringSection';

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
    if (section === 'general') return null;
    if (draft.dvt.mode === 'uninitialized') {
      return (
        <DvtSubstraitTransformStart
          disabled={disabled}
          node={node}
          nodes={nodes}
          edges={edges}
          onChange={onChange}
        />
      );
    }
    if (draft.dvt.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return null;
    if (draft.dvt.shape === 'projection') {
      return (
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
    }
    if (draft.dvt.shape === 'inner_join') {
      return (
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
        />
      );
    }
    if (draft.dvt.shape === 'union_all') {
      return (
        <DvtSubstraitUnionAllAuthoringSection
          disabled={disabled}
          draft={draft.dvt}
          onChange={onChange}
        />
      );
    }
    return (
      <DvtSubstraitPilotAuthoringSection
        disabled={disabled}
        draft={draft.dvt}
        onChange={onChange}
      />
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
