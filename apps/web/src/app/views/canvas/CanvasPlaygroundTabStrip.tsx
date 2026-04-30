/** Owned concern: mount the host-owned Canvas tab-strip presentation boundary. */
import { CanvasPlaygroundTabStripTemplate } from './CanvasPlaygroundTabStrip.templates';
import {
  type CanvasPlaygroundTabStripProps,
  useCanvasPlaygroundTabStripPresenter,
} from './useCanvasPlaygroundTabStripPresenter';

export function CanvasPlaygroundTabStrip(props: CanvasPlaygroundTabStripProps): JSX.Element | null {
  const templateProps = useCanvasPlaygroundTabStripPresenter(props);

  return templateProps == null ? null : <CanvasPlaygroundTabStripTemplate {...templateProps} />;
}
