/** Owned concern: render dbt-specific Canvas Inspector authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { canvasViewCopy } from './copy';
import { DbtModelCodeAuthoringSection } from './DbtModelCodeAuthoringSection';
import { DbtModelAuthoringSection } from './DbtModelAuthoringSection';
import { DbtSourceAuthoringSection } from './DbtSourceAuthoringSection';
import { DbtTestAuthoringSection } from './DbtTestAuthoringSection';
import { buildDbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';
import { buildDbtTestAuthoringFieldsModel } from './dbtTestAuthoringFieldsModel';

type DbtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  section?: 'general' | 'code';
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
  onCommitModelChange?: (draft: ReturnType<typeof createCanvasInspectorNodeDraft>) => void;
}>;

export function DbtAuthoringFields({
  node,
  nodes,
  edges,
  disabled,
  draft,
  errors,
  section = 'general',
  onChange,
  onCommitModelChange,
}: DbtAuthoringFieldsProps): JSX.Element | null {
  if (node.kind === 'dbt:test' && draft.dbtTest) {
    if (section === 'code') return null;

    return (
      <DbtTestAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dbtTest}
        errors={errors.dbtTest}
        projection={buildDbtTestAuthoringFieldsModel({
          node,
          nodes,
          edges,
          targetModelId: draft.dbtTest.targetModelId,
        })}
        onChange={onChange}
      />
    );
  }

  if (!draft.dbt) {
    return null;
  }

  if (node.kind === 'dbt:source') {
    if (section === 'code') {
      return null;
    }

    return (
      <DbtSourceAuthoringSection
        node={node}
        disabled={disabled}
        draft={draft.dbt}
        errors={errors.dbt}
        onChange={onChange}
      />
    );
  }

  if (node.kind !== 'dbt:model') {
    return null;
  }

  const projection = buildDbtAuthoringModelProjection({
    node,
    nodes,
    edges,
    authoringMetadata: draft.dbt,
    kindLabels: {
      'dbt:source': canvasViewCopy.inspectorDbtOriginKindSourceLabel,
      'dbt:model': canvasViewCopy.inspectorDbtOriginKindModelLabel,
    },
  });
  const commitModelChange = (nextDbt: typeof draft.dbt): void => {
    if (nextDbt == null) return;
    const nextDraft = { ...draft, dbt: nextDbt };
    if (onCommitModelChange != null) {
      onCommitModelChange(nextDraft);
      return;
    }
    onChange(nextDraft);
  };

  return section === 'code' ? (
    <DbtModelCodeAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dbt}
      projection={projection}
      onChange={onChange}
    />
  ) : (
    <DbtModelAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dbt}
      errors={errors.dbt}
      projection={projection}
      onChange={onChange}
      onCommitChange={commitModelChange}
    />
  );
}
