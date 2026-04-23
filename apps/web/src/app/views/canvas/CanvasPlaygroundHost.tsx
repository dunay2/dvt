/** Owned concern: render the host-owned first-canvas creation state for the Canvas playground. */
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { routeWorkbenchMutedTextClassName, routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { cn } from '../../components/ui/utils';
import { canvasViewCopy } from './copy';

export type CreateCanvasDocumentCommand = (command: {
  kind: string;
  title: string;
}) => void;

export function CanvasPlaygroundHost({
  canvasKinds,
  onCreateCanvasDocument,
}: Readonly<{
  canvasKinds: readonly CanvasKindRegistration[];
  onCreateCanvasDocument?: CreateCanvasDocumentCommand;
}>) {
  return (
    <div
      data-slot="canvas-playground-empty-state-frame"
      className="flex flex-1 items-center justify-center p-6"
    >
      <Card
        data-slot="canvas-playground-empty-state"
        className={cn(routeWorkbenchPanelClassName, 'w-full max-w-3xl p-6')}
      >
        <h2 className="mb-2 text-base font-semibold text-(--text-default)">
          {canvasViewCopy.routeNeedsCanvasTitle}
        </h2>
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
          {canvasViewCopy.routeNeedsCanvasMessage}
        </p>
        <p className={cn('mt-2 text-xs', routeWorkbenchMutedTextClassName)}>
          {canvasViewCopy.routeNeedsCanvasHelper}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {canvasKinds.map((registration) => (
            <Button
              key={registration.kind}
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-4 text-left"
              onClick={() =>
                onCreateCanvasDocument?.({
                  kind: registration.kind,
                  title: registration.createTitle,
                })
              }
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
