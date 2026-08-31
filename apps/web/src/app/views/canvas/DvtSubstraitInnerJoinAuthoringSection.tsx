/** Owned concern: present the admitted two-source Substrait INNER JOIN in Node Properties. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { inspectDvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { canvasViewCopy } from './copy';

export function DvtSubstraitInnerJoinAuthoringSection({
  draft,
}: Readonly<{
  draft: DvtSubstraitTransformAuthoringMetadata;
}>): JSX.Element | null {
  const inspection = inspectDvtSubstraitInnerJoinDraft({
    plan: draft.plan,
    sidecar: draft.sidecar,
  });
  if (!inspection.ok) return null;
  const { projection } = inspection;

  return (
    <div
      className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}
      data-slot="dvt-substrait-inner-join-authoring"
    >
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitInnerJoinTitle}
      </h3>
      <p className="text-xs text-(--text-muted)">
        {projection.left.table} + {projection.right.table}
      </p>
      <dl className="space-y-2 text-xs">
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitJoinConditionLabel}
          </dt>
          <dd>
            {projection.left.table}.{projection.leftKey} = {projection.right.table}.
            {projection.rightKey}
          </dd>
        </div>
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitSelectedFieldsLabel}
          </dt>
          <dd>{projection.outputs.map((output) => output.name).join(', ')}</dd>
        </div>
      </dl>
    </div>
  );
}
