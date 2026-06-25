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
  onChange,
}: DvtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dvt) {
    return null;
  }

  if (draft.dvt.kind === 'source') {
    return (
      <DvtSourceAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        sourceTarget={formatQualifiedTarget([
          draft.dvt.database,
          draft.dvt.schema,
          draft.dvt.table,
        ])}
        onChange={onChange}
      />
    );
  }

  if (draft.dvt.kind === 'sql_transform') {
    return (
      <DvtSqlTransformAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dvt}
        errors={errors.dvt}
        onChange={onChange}
      />
    );
  }

  return (
    <DvtSinkAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dvt}
      errors={errors.dvt}
      destinationTarget={formatQualifiedTarget([
        draft.dvt.database,
        draft.dvt.schema,
        draft.dvt.table,
      ])}
      onChange={onChange}
    />
  );
}
