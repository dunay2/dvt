/** Own the operation-data drawer contribution and its portal host. */
import { useCallback, useMemo, useState } from 'react';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerTab,
} from '../../components/shell/operationalDrawerContributionStore';
import type { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function useCanvasOperationDataTab(
  copy: Pick<
    ReturnType<typeof resolveCanvasSemanticEditorCopy>,
    'operationData' | 'selectOperation'
  >
) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const selectTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const showDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const open = useCallback(() => {
    selectTab('data:operation');
    showDrawer(Math.max(260, useUiLayoutStore.getState().bottomDrawerHeight));
  }, [selectTab, showDrawer]);
  const tab = useMemo<OperationalDrawerTab>(
    () => ({
      id: 'data:operation',
      label: copy.operationData,
      count: null,
      content: (
        <div
          ref={setHost}
          data-slot="canvas-operation-data-host"
          className="h-full min-h-0 min-w-0"
        >
          <p className="p-4 text-sm text-(--text-muted)">{copy.selectOperation}</p>
        </div>
      ),
    }),
    [copy.operationData, copy.selectOperation]
  );
  return { host, tab, open };
}
