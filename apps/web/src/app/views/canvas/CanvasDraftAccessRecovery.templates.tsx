/** Owned concern: render passive Canvas draft-access recovery actions from resolved posture state. */
import { Button } from '../../components/ui/button';
import type { CanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';

export type CanvasDraftAccessRecoveryTemplateProps = Readonly<{
  viewState: Pick<CanvasRecoveryBannerViewState, 'actionEnabled' | 'actionLabel'>;
  onAction: (() => void) | null;
}>;

export function CanvasDraftAccessRecoveryTemplate({
  viewState,
  onAction,
}: CanvasDraftAccessRecoveryTemplateProps): JSX.Element {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!viewState.actionEnabled || onAction == null}
      onClick={onAction ?? undefined}
    >
      {viewState.actionLabel}
    </Button>
  );
}
