/** Owned concern: present the latest node sample in the existing Data drawer. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerDataSample,
} from '../../components/shell/operationalDrawerContributionStore';
import type { SourceDataSample } from '../../ports/workspace';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { resolveCanvasSourceDataSampleError } from './canvasSourceDataSample';

export function useCanvasDataSample() {
  const [dataSample, setDataSample] = useState<OperationalDrawerDataSample>({ status: 'idle' });
  const requestIdRef = useRef(0);
  const showBottomDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const selectTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const openDataSample = useCallback(
    (nodeName: string, load?: () => Promise<SourceDataSample>) => {
      const requestId = ++requestIdRef.current;
      setDataSample(
        load == null
          ? { status: 'error', nodeName, reason: 'unavailable' }
          : { status: 'loading', nodeName }
      );
      selectTab('data');
      showBottomDrawer(300);
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            '[data-slot="bottom-operational-drawer-tab"][data-tab="data"]'
          )
          ?.focus({ preventScroll: true });
      });
      if (load == null) return;

      void load()
        .then((sample) => {
          if (requestIdRef.current === requestId) {
            setDataSample({ status: 'ready', nodeName, sample });
          }
        })
        .catch((error: unknown) => {
          if (requestIdRef.current === requestId) {
            setDataSample(resolveCanvasSourceDataSampleError(error, nodeName));
          }
        });
    },
    [selectTab, showBottomDrawer]
  );
  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    []
  );
  return { dataSample, openDataSample };
}
