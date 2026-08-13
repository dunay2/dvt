/** Owned concern: render DVT-specific Canvas Inspector authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { DvtSinkAuthoringSection } from './DvtSinkAuthoringSection';
import { DvtSourceAuthoringSection } from './DvtSourceAuthoringSection';
import { DvtSqlTransformAuthoringSection } from './DvtSqlTransformAuthoringSection';

type DvtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  section?: 'all' | 'general' | 'columns' | 'code';
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

function formatQualifiedTarget(parts: readonly string[]): string {
  const normalizedParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  return normalizedParts.length > 0 ? normalizedParts.join('.') : '-';
}

export function DvtAuthoringFields({
  node,
  disabled,
  draft,
  errors,
  section = 'all',
  onChange,
}: DvtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dvt) {
    return null;
  }

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

    return (
      <DvtSqlTransformAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        section={section === 'code' ? 'code' : 'all'}
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
      onChange={onChange}
    />
  );
}
