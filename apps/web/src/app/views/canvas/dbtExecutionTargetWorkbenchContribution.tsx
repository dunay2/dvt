/** Owned concern: show the effective read-only dbt execution binding in the node Workbench. */
import type { DbtExecutionTargetIdentity } from '@dvt/contracts';

import { projectDbtExecutionTargetBinding } from '../../components/dbtExecutionTargetBinding';
import { Badge } from '../../components/ui/badge';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';

function DbtExecutionTargetBindingSummary({
  target,
  language,
}: Readonly<{
  target: DbtExecutionTargetIdentity;
  language: ApplicationLanguage;
}>): JSX.Element {
  const copy = resolveCanvasViewCopy(language);
  const model = projectDbtExecutionTargetBinding(target, copy.planPreviewEnvironmentDefaultValue);
  const rows = [
    [copy.planPreviewExecutorLabel, model.executor],
    [copy.planPreviewAdapterLabel, model.adapter],
    [copy.planPreviewTargetLabel, model.target],
    [copy.planPreviewConnectionLabel, model.connection],
    [copy.planPreviewResolutionSourceLabel, model.resolution],
  ] as const;

  return (
    <section data-slot="dbt-execution-target-binding" className="space-y-3 pb-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-(--text-default)">
          {copy.planPreviewExecutionTargetTitle}
        </h3>
        <Badge variant="outline">{copy.planPreviewReadOnlyLabel}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-(--border-default) py-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-(--text-muted)">{label}</dt>
            <dd className="break-words font-medium text-(--text-default)">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function buildDbtExecutionTargetWorkbenchContributions({
  node,
  target,
  language,
}: Readonly<{
  node: CanonicalNode | null;
  target: DbtExecutionTargetIdentity | undefined;
  language: ApplicationLanguage;
}>): readonly CanvasNodeWorkbenchContribution[] {
  if (node == null || !hasDbtCompatibilityMetadata(node) || target === undefined) {
    return [];
  }

  return [
    {
      id: 'dbt-execution-target-binding',
      nodeId: node.id,
      sectionId: 'general',
      placement: 'before-body',
      content: <DbtExecutionTargetBindingSummary target={target} language={language} />,
    },
  ];
}
