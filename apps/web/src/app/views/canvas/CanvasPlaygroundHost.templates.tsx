/** Owned concern: render the first Canvas action without owning command policy. */
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';

export type CanvasPlaygroundHostTemplateCopy = Readonly<{
  title: string;
  message: string;
  actionLabel: string;
}>;

export type CanvasPlaygroundHostTemplateProps = Readonly<{
  copy: CanvasPlaygroundHostTemplateCopy;
  unavailableMessage?: string | null;
  onCreateCanvas?: () => void;
}>;

export function CanvasPlaygroundHostTemplate({
  copy,
  unavailableMessage,
  onCreateCanvas,
}: CanvasPlaygroundHostTemplateProps): JSX.Element {
  return (
    <div
      data-slot="canvas-playground-empty-state-frame"
      className="flex flex-1 items-center justify-center p-6"
    >
      <Card
        data-slot="canvas-playground-empty-state"
        className={cn(routeWorkbenchPanelClassName, 'w-full max-w-md p-6')}
      >
        <h2 className="mb-2 text-base font-semibold text-(--text-default)">{copy.title}</h2>
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{copy.message}</p>
        {unavailableMessage ? (
          <p
            data-slot="canvas-playground-template-unavailable"
            className="mt-3 text-sm font-medium text-[var(--status-warning)]"
          >
            {unavailableMessage}
          </p>
        ) : null}
        <Button
          data-slot="canvas-playground-template-choice"
          type="button"
          disabled={onCreateCanvas == null}
          className="mt-5 enabled:cursor-pointer disabled:cursor-not-allowed"
          onClick={onCreateCanvas}
        >
          {copy.actionLabel}
        </Button>
      </Card>
    </div>
  );
}
