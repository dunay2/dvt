/**
 * Owned concern: expose the Canvas explorer visibility preference in the shell View menu.
 * Reason: this one menu item consumes the shared layout owner directly.
 * Corner invariant: reopening preserves retained graph and catalogue state.
 * @baseline GH-3610: closing a window does not delete its content or graph state.
 * @decision Reuse shell layout commands and the canonical Canvas route predicate.
 * @consequence Only Canvas routes offer reopening; presentation does not author graph data.
 * @version 1.0.0
 */
import { useLocation } from 'react-router';
import { isCanvasRoute } from '../../../shell/shellNavigationDisposition';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { DropdownMenuCheckboxItem } from '../../../components/ui/dropdown-menu';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

export function CanvasExplorerViewMenu(): JSX.Element | null {
  const { pathname } = useLocation();
  const visible = useUiLayoutStore((state) => state.canvasExplorer.mode !== 'closed');
  const dispatch = useUiLayoutStore((state) => state.dispatchCanvasExplorer);
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  if (!isCanvasRoute(pathname)) return null;
  return (
    <DropdownMenuCheckboxItem
      data-slot="canvas-explorer-view-command"
      checked={visible}
      onCheckedChange={(next) => dispatch({ type: next ? 'expand' : 'close' })}
    >
      {copy.navigation}
    </DropdownMenuCheckboxItem>
  );
}
