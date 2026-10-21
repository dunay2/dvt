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
import {
  createDvtSinkAuthoringBinding,
  createDvtTransformDestinationBinding,
  createDvtTransformMaterializationBinding,
} from './dvtDestinationBinding';
import { canvasViewCopy } from './copy';
import styles from './dvtDestinationFields.module.css';

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
    return (
      <div className={styles.stack}>
        <DvtTransformMaterializationField
          binding={createDvtTransformMaterializationBinding({
            draft: draft.dvt,
            disabled,
            errors: errors.dvt,
            onChange,
            copy: canvasViewCopy,
          })}
          copy={canvasViewCopy}
        />
        {draft.dvt.materialized === 'ephemeral' ? null : (
          <DvtTransformResultTargetFields
            binding={createDvtTransformDestinationBinding({
              draft: draft.dvt,
              disabled,
              errors: errors.dvt,
              onChange,
              connection: provenance.kind === 'resolved' ? provenance.connectionRef : undefined,
            })}
            copy={canvasViewCopy}
          />
        )}
      </div>
    );
  }

  if (section !== 'all' && section !== 'general') return null;
  const provenance = resolveDvtConnectionProvenance({ node, nodes, edges });
  return (
    <DvtSinkAuthoringSection
      binding={createDvtSinkAuthoringBinding({
        draft: draft.dvt,
        disabled,
        errors: errors.dvt,
        onChange,
        copy: canvasViewCopy,
        connection: provenance.kind === 'resolved' ? provenance.connectionRef : undefined,
      })}
      copy={canvasViewCopy}
    />
  );
}
