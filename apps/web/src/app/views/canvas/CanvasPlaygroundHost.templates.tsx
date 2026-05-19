/** Owned concern: render Canvas playground first-document host templates from resolved host props. */
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanvasTemplatePresentation } from './canvasTemplatePresentation';

export type CanvasPlaygroundHostTemplateCopy = Readonly<{
  title: string;
  message: string;
  helper: string;
  workspaceLabel: string;
  adapterLabel: string;
  templateLabel: string;
}>;

export type CanvasPlaygroundHostTemplateProps = Readonly<{
  copy: CanvasPlaygroundHostTemplateCopy;
  workspaceScope: WorkspaceScope;
  templates: readonly CanvasTemplatePresentation[];
  onCreateCanvasTemplate?: (template: CanvasTemplatePresentation) => void;
}>;

function formatWorkspaceScope(workspaceScope: WorkspaceScope): string {
  return `${workspaceScope.tenantId} / ${workspaceScope.projectId} / ${workspaceScope.environmentId}`;
}

export function CanvasPlaygroundHostTemplate({
  copy,
  workspaceScope,
  templates,
  onCreateCanvasTemplate,
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
          <span>
            {copy.adapterLabel}: {workspaceScope.targetAdapter}
          </span>
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
          {templates.map((template) => (
            <Button
              key={template.kind}
              data-slot="canvas-playground-template-choice"
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-4 text-left"
              onClick={() => onCreateCanvasTemplate?.(template)}
            >
              <span className="text-sm font-semibold">{template.title}</span>
              <span className={cn('text-xs', routeWorkbenchMutedTextClassName)}>
                {template.description}
              </span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
