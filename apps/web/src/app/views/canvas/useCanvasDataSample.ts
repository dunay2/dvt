/** Owned concern: present the latest node sample in the existing Data drawer. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerDataSample,
  type OperationalDrawerDataSampleTab,
  type OperationalDrawerDataTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import {
  CanvasTransformDataSampleQueryError,
  type CanvasDataSample,
} from '../../ports/canvasDataSample';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { resolveCanvasSourceDataSampleError } from './canvasSourceDataSample';

export function useCanvasDataSample() {
  const [dataSampleTabs, setDataSampleTabs] = useState<readonly OperationalDrawerDataSampleTab[]>(
    []
  );
  const requestIdsRef = useRef(new Map<OperationalDrawerDataTabId, number>());
  const showBottomDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const selectTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const openDataSample = useCallback(
    (
      nodeId: string,
      nodeName: string,
      load?: () => Promise<CanvasDataSample>,
      unavailableReason: Extract<
        OperationalDrawerDataSample,
        { status: 'error' }
      >['reason'] = 'unavailable'
    ) => {
      const tabId: OperationalDrawerDataTabId = `data:${nodeId}`;
      const requestId = (requestIdsRef.current.get(tabId) ?? 0) + 1;
      requestIdsRef.current.set(tabId, requestId);
      const replaceTab = (dataSample: OperationalDrawerDataSample) =>
        setDataSampleTabs((current) => {
          const next = { id: tabId, dataSample } as const;
          const index = current.findIndex((tab) => tab.id === tabId);
          return index < 0
            ? [...current, next]
            : current.map((tab, tabIndex) => (tabIndex === index ? next : tab));
        });
      replaceTab(
        load == null
          ? { status: 'error', nodeName, reason: unavailableReason }
          : { status: 'loading', nodeName }
      );
      selectTab(tabId);
      showBottomDrawer(300);
      window.requestAnimationFrame(() => {
        Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            '[data-slot="bottom-operational-drawer-tab"]'
          )
        )
          .find((tab) => tab.dataset.tab === tabId)
          ?.focus({ preventScroll: true });
      });
      if (load == null) return;

      void load()
        .then((sample) => {
          if (requestIdsRef.current.get(tabId) === requestId) {
            replaceTab({ status: 'ready', nodeName, sample });
          }
        })
        .catch((error: unknown) => {
          if (requestIdsRef.current.get(tabId) === requestId) {
            replaceTab(
              error instanceof CanvasTransformDataSampleQueryError
                ? { status: 'error', nodeName, reason: 'unavailable' }
                : resolveCanvasSourceDataSampleError(error, nodeName)
            );
          }
        });
    },
    [selectTab, showBottomDrawer]
  );
  useEffect(
    () => () => {
      requestIdsRef.current.clear();
    },
    []
  );
  return { dataSampleTabs, openDataSample };
}
