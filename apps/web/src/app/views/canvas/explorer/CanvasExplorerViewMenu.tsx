/**
 * Owned concern: expose the Canvas explorer visibility preference in the shell View menu.
 * @baseline GH-3610: closing a window does not delete its content or graph state.
 * @decision Reuse shell layout commands and the canonical Canvas route predicate.
 * @consequence Only Canvas routes offer reopening; presentation does not author graph data.
 * @version 1.0.0
 */
import { useLocation } from 'react-router';
import { isCanvasRoute } from '../../../shell/shellNavigationDisposition';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerMenuTemplate } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

export function CanvasExplorerViewMenu(): JSX.Element | null {
  const { pathname } = useLocation();
  const visible = useUiLayoutStore((state) => state.canvasExplorerVisible);
  const show = useUiLayoutStore((state) => state.showCanvasExplorer);
  const hide = useUiLayoutStore((state) => state.hideCanvasExplorer);
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  if (!isCanvasRoute(pathname)) return null;
  return (
    <CanvasExplorerMenuTemplate
      visible={visible}
      copy={copy}
      onVisibleChange={(next) => (next ? show() : hide())}
    />
  );
}
