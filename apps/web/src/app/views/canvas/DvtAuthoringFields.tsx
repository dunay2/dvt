/** Owned concern: route DVT Inspector sections to focused authoring components. */
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { resolveDvtConnectionProvenance } from './canvasDvtConnectionProvenance';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtTransformResultTargetFields } from './DvtTransformResultTargetFields';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtTransformMaterializationField } from './DvtTransformMaterializationField';

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
    if (section !== 'all' && section !== 'general') return null;
    const provenance = resolveDvtConnectionProvenance({ node, nodes, edges });
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
          connection={provenance.kind === 'resolved' ? provenance.connectionRef : undefined}
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
    return materializationField;
  }

  if (section !== 'all' && section !== 'general') return null;
  const provenance = resolveDvtConnectionProvenance({ node, nodes, edges });
  return (
    <DvtSinkAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dvt}
      errors={errors.dvt}
      destinationTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table]) || '-'}
      inheritedConnectionId={
        provenance.kind === 'resolved' ? provenance.connectionRef.connectionId : undefined
      }
      onChange={onChange}
    />
  );
}
