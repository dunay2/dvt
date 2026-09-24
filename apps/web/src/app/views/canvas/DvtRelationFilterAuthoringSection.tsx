/** Inspector adapter for the same selected-relation Filter command used by the Canvas. */
import { useContext, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useSelectedRelationFilter } from './useSelectedRelationFilter';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';

type FilterSectionProps = Readonly<{
  disabled: boolean;
  draft: DvtSubstraitProjectionDraft;
  node: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
}>;
function RootFilterForm({
  draft,
  onChange,
}: Pick<FilterSectionProps, 'draft' | 'onChange'>): JSX.Element | null {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [formVersion, resetForm] = useState(0);
  const root = draft.plan.relations[0]?.relType;
  const editing = root?.case === 'root' && root.value.input?.relType.case === 'filter';
  const filter = useSelectedRelationFilter(null, editing ? 'edit' : 'insert');
  if (filter?.tool.enabled !== true) return null;
  return (
    <CanvasRelationalTreeOperatorForm
      key={`${analysis?.revision}:${formVersion}`}
      inline
      tool={filter.tool}
      draft={draft}
      title="Filter"
      targetRelationId={filter.targetId}
      onChange={onChange}
      onClose={() => resetForm((version) => version + 1)}
    />
  );
}
export function DvtRelationFilterAuthoringSection(props: FilterSectionProps): JSX.Element {
  const analysis = useCanvasRelationAnalysisSession(props.draft, props.node.id);
  return (
    <section data-slot="dvt-filter-authoring">
      <CanvasRelationAnalysisContext.Provider value={analysis}>
        {props.disabled ? null : <RootFilterForm draft={props.draft} onChange={props.onChange} />}
      </CanvasRelationAnalysisContext.Provider>
    </section>
  );
}
