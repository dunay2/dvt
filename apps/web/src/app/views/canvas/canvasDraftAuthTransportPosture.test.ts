import { describe, expect, it } from 'vitest';

import { ApiError } from '../../services/api/createApiClient';
import { deriveCanvasDraftAuthTransportPosture } from './canvasDraftAuthTransportPosture';

describe('canvasDraftAuthTransportPosture', () => {
  it('maps final protected draft 401 errors to an unauthorized transport posture', () => {
    const posture = deriveCanvasDraftAuthTransportPosture({
      draftReadError: new ApiError({
        message: 'Request to /workspace/graph/draft failed (401)',
        endpoint: '/workspace/graph/draft',
        statusCode: 401,
        category: 'unauthorized',
      }),
    });

    expect(posture).toBe('unauthorized_final');
  });

  it('does not infer auth state from non-401 protected draft failures', () => {
    expect(
      deriveCanvasDraftAuthTransportPosture({
        draftReadError: new ApiError({
          message: 'Request to /workspace/graph/draft failed (403)',
          endpoint: '/workspace/graph/draft',
          statusCode: 403,
          category: 'forbidden',
        }),
      })
    ).toBe('none');
    expect(
      deriveCanvasDraftAuthTransportPosture({
        draftReadError: new Error('network still pending'),
      })
    ).toBe('none');
  });
});
