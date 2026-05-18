/** Owned concern: render Canvas playground first-document host templates from resolved host props. */
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { WorkspaceScope } from '../../ports/sessionContext';

export type CanvasPlaygroundHostTemplateCopy = Readonly<{
  title: string;
  message: string;
  helper: string;
  workspaceLabel: string;
  templateLabel: string;
}>;

export type CanvasPlaygroundHostTemplateProps = Readonly<{
  copy: CanvasPlaygroundHostTemplateCopy;
  workspaceScope: WorkspaceScope;
  canvasKinds: readonly CanvasKindRegistration[];
  onCreateCanvasKind?: (registration: CanvasKindRegistration) => void;
}>;

function formatWorkspaceScope(workspaceScope: WorkspaceScope): string {
  return `${workspaceScope.tenantId} / ${workspaceScope.projectId} / ${workspaceScope.environmentId}`;
}

export function CanvasPlaygroundHostTemplate({
  copy,
  workspaceScope,
  canvasKinds,
  onCreateCanvasKind,
}: CanvasPlaygroundHostTemplateProps): JSX.Element {
  return (
    <div
      data-slot="canvas-playground-empty-state-frame"
      className="flex flex-1 items-center justify-center p-6"
    >
      <Card
        data-slot="canvas-playground-empty-state"
        className={cn(routeWorkbenchPanelClassName, 'w-full max-w-3xl p-6')}
      >
        <div
          data-slot="canvas-playground-workspace-context"
          className={cn(
            'mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
            routeWorkbenchMutedTextClassName
          )}
        >
          <span className="font-semibold text-(--text-default)">{copy.workspaceLabel}</span>
          <span>{formatWorkspaceScope(workspaceScope)}</span>
          <span>Adapter: {workspaceScope.targetAdapter}</span>
        </div>
        <h2 className="mb-2 text-base font-semibold text-(--text-default)">{copy.title}</h2>
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{copy.message}</p>
        <p className={cn('mt-2 text-xs', routeWorkbenchMutedTextClassName)}>{copy.helper}</p>
        <h3
          data-slot="canvas-playground-template-label"
          className="mt-5 text-sm font-semibold text-(--text-default)"
        >
          {copy.templateLabel}
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {canvasKinds.map((registration) => (
            <Button
              key={registration.kind}
              data-slot="canvas-playground-template-choice"
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-4 text-left"
              onClick={() => onCreateCanvasKind?.(registration)}
            >
              <span className="text-sm font-semibold">{registration.createTitle}</span>
              <span className={cn('text-xs', routeWorkbenchMutedTextClassName)}>
                {registration.description}
              </span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
