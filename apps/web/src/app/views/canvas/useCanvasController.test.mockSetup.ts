import {
  configureCanvasHarnessDraftTransportMocks,
  configureCanvasHarnessLayoutMocks,
  configureCanvasHarnessStoreStateMocks,
} from './useCanvasController.test.mockWiring';
import { configureCanvasHarnessHookAndProjectionMocks } from './useCanvasController.test.projectionMocks';
import { configureCanvasHarnessQueryClientMocks } from './useCanvasController.test.queryClientMocks';
import type { CanvasHarnessMocks, CanvasHarnessState } from './useCanvasController.test.types';

export function configureDefaultCanvasHarnessMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  configureCanvasHarnessStoreStateMocks(state);
  configureCanvasHarnessDraftTransportMocks(state);
  configureCanvasHarnessQueryClientMocks(state, mocks);
  configureCanvasHarnessLayoutMocks(state);
  configureCanvasHarnessHookAndProjectionMocks(state, mocks);
}
