/** Owned concern: render DVT-specific Canvas Inspector authoring fields. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { resolveInheritedDvtConnectionRef } from './canvasDvtAuthoringModel';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtSqlTransformAuthoringSection } from './DvtSqlTransformAuthoringSection';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  section?: 'all' | 'general' | 'code';
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

function formatQualifiedTarget(parts: readonly string[]): string {
  const normalizedParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  return normalizedParts.length > 0 ? normalizedParts.join('.') : '-';
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
  if (!draft.dvt) {
    return null;
  }

  const inheritedConnectionId = resolveInheritedDvtConnectionRef({
    node,
    nodes,
    edges,
  })?.connectionId;

  if (draft.dvt.kind === 'source') {
    if (section !== 'all' && section !== 'general') {
      return null;
    }

    return (
      <DvtSourceAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        sourceTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table])}
        onChange={onChange}
      />
    );
  }

  if (draft.dvt.kind === 'sql_transform') {
    if (section !== 'all' && section !== 'code') {
      return null;
    }

    if (draft.dvt.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      return null;
    }

    return (
      <DvtSqlTransformAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        section={section === 'code' ? 'code' : 'all'}
        inheritedConnectionId={inheritedConnectionId}
        onChange={onChange}
      />
    );
  }

  if (section !== 'all' && section !== 'general') {
    return null;
  }

  return (
    <DvtSinkAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dvt}
      errors={errors.dvt}
      destinationTarget={formatQualifiedTarget([draft.dvt.schema, draft.dvt.table])}
      inheritedConnectionId={inheritedConnectionId}
      onChange={onChange}
    />
  );
}
