/** Owned concern: render Canvas playground first-document host templates from resolved host props. */
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';

export type CanvasPlaygroundHostTemplateCopy = Readonly<{
  title: string;
  message: string;
  helper: string;
}>;

export type CanvasPlaygroundHostTemplateProps = Readonly<{
  copy: CanvasPlaygroundHostTemplateCopy;
  canvasKinds: readonly CanvasKindRegistration[];
  onCreateCanvasKind?: (registration: CanvasKindRegistration) => void;
}>;

export function CanvasPlaygroundHostTemplate({
  copy,
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
        <h2 className="mb-2 text-base font-semibold text-(--text-default)">{copy.title}</h2>
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{copy.message}</p>
        <p className={cn('mt-2 text-xs', routeWorkbenchMutedTextClassName)}>{copy.helper}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {canvasKinds.map((registration) => (
            <Button
              key={registration.kind}
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-4 text-left"
              onClick={() => onCreateCanvasKind?.(registration)}
            >
              <span className="text-sm font-semibold">{registration.label}</span>
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
