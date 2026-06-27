/** Owned concern: render dbt-specific Canvas Inspector authoring fields. */
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { canvasViewCopy } from './copy';
import { DbtModelAuthoringSection } from './DbtModelAuthoringSection';
import { DbtSourceAuthoringSection } from './DbtSourceAuthoringSection';
import { buildDbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

type DbtAuthoringFieldsProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  disabled: boolean;
  draft: ReturnType<typeof createCanvasInspectorNodeDraft>;
  errors: ReturnType<typeof validateCanvasInspectorNodeDraft>;
  onChange: Dispatch<SetStateAction<ReturnType<typeof createCanvasInspectorNodeDraft>>>;
}>;

export function DbtAuthoringFields({
  node,
  nodes,
  edges,
  disabled,
  draft,
  errors,
  onChange,
}: DbtAuthoringFieldsProps): JSX.Element | null {
  if (!draft.dbt) {
    return null;
  }

  if (node.kind === 'dbt:source') {
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
    selectedOriginId: draft.dbt.selectedSourceId,
    kindLabels: {
      'dbt:source': canvasViewCopy.inspectorDbtOriginKindSourceLabel,
      'dbt:model': canvasViewCopy.inspectorDbtOriginKindModelLabel,
    },
  });

  return (
    <DbtModelAuthoringSection
      node={node}
      disabled={disabled}
      draft={draft.dbt}
      errors={errors.dbt}
      projection={projection}
      onChange={onChange}
    />
  );
}
