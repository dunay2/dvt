/**
 * Owned concern: share the pending-capabilities setup between its two startup browser proofs.
 * Reason: callers own readiness or stylesheet assertions; this fixture never publishes fake completion.
 */
import { stubCanvasDraftRead } from './canvasDraftAuthoring';
import { stubE2eApi, stubE2eJsonApi } from './e2eApiStub';
import { E2E_PROJECT_WORKSPACE, visitWithE2eWorkspaceSession } from './workspaceSession';

export function visitCanvasWithPendingCapabilities(): () => void {
  let releaseCapabilities: (() => void) | undefined;
  stubE2eApi(
    'GET',
    '/capabilities',
    () =>
      new Promise((resolve) => {
        releaseCapabilities = () => {
          resolve({
            body: {
              apiVersion: '1.0.0',
              minFrontendVersion: '0.0.1',
              plugins: {
                dvt: { available: true },
              },
            },
          });
        };
      })
  );
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubCanvasDraftRead();
  visitWithE2eWorkspaceSession('/canvas');
  return () => {
    if (releaseCapabilities == null) {
      throw new Error('Capabilities request must be observed before it is released');
    }
    releaseCapabilities();
  };
}
