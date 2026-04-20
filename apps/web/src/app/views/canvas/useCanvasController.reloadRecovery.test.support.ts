import { act } from 'react';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  type CanvasControllerHarness,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

export async function createReloadRecoveryHarness(): Promise<CanvasControllerHarness> {
  const harness = setupCanvasControllerHarness();
  await harness.renderProbe();
  return harness;
}

export async function replaceHarnessWithDraft(
  harness: CanvasControllerHarness,
  record: ReturnType<typeof buildRemoteDraftRecord>
): Promise<CanvasControllerHarness> {
  harness.cleanup();
  return await createHarnessWithDraft(record);
}

export async function reloadLatestDraft(harness: CanvasControllerHarness): Promise<void> {
  await act(async () => {
    harness.getLatestResult()?.reloadLatestDraft();
    await Promise.resolve();
  });
  await harness.renderProbe();
}
