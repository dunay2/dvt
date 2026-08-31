/** Owned concern: present the admitted two-source Substrait UNION ALL in Node Properties. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { inspectDvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';
import { canvasViewCopy } from './copy';

export function DvtSubstraitUnionAllAuthoringSection({
  draft,
}: Readonly<{
  draft: DvtSubstraitTransformAuthoringMetadata;
}>): JSX.Element | null {
  const inspection = inspectDvtSubstraitUnionAllDraft({
    plan: draft.plan,
    sidecar: draft.sidecar,
  });
  if (!inspection.ok) return null;

  return (
    <div
      className={`${inspectorVisualClasses.inspectorDbtSection} space-y-3`}
      data-slot="dvt-substrait-union-all-authoring"
    >
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSubstraitUnionAllTitle}
      </h3>
      <dl className="space-y-3 text-xs">
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitUnionAllInputsLabel}
          </dt>
          <dd className="font-mono">
            {inspection.projection.inputs
              .map((input) => `${input.schema}.${input.table}`)
              .join(' UNION ALL ')}
          </dd>
        </div>
        <div>
          <dt className="text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitUnionAllFieldsLabel}
          </dt>
          <dd className="font-mono">
            {inspection.projection.outputs.map((output) => output.name).join(', ')}
          </dd>
        </div>
      </dl>
    </div>
  );
}
