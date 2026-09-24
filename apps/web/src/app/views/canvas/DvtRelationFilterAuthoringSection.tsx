/** Inspector adapter for the same selected-relation Filter command used by the Canvas. */
import { useContext, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';

type FilterSectionProps = Readonly<{
  disabled: boolean;
  draft: DvtSubstraitProjectionDraft;
  node: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
}>;
function ProjectionInputFilterForm({
  draft,
  onChange,
  relationId,
  intent,
}: Pick<FilterSectionProps, 'draft' | 'onChange'> &
  Readonly<{
    relationId: string;
    intent: 'insert' | 'edit';
  }>): JSX.Element | null {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [formVersion, resetForm] = useState(0);
  const filter = useSelectedRelationTool(relationId, 'filter', intent);
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
  const root =
    analysis?.document != null && analysis.error == null
      ? analysis.session.locate(analysis.session.rootId, analysis.revision)
      : null;
  const inputId = root?.relation.relType.case === 'project' ? root.inputs[0] : undefined;
  const input =
    inputId == null || analysis == null
      ? null
      : analysis.session.locate(inputId, analysis.revision);
  return (
    <section data-slot="dvt-filter-authoring">
      <CanvasRelationAnalysisContext.Provider value={analysis}>
        {props.disabled || input == null ? null : (
          <ProjectionInputFilterForm
            draft={props.draft}
            onChange={props.onChange}
            relationId={input.binding.relationId}
            intent={input.relation.relType.case === 'filter' ? 'edit' : 'insert'}
          />
        )}
      </CanvasRelationAnalysisContext.Provider>
    </section>
  );
}
