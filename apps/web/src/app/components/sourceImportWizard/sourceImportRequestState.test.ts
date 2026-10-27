import { describe, expect, it } from 'vitest';

import {
  transitionSourceImportRequest,
  type SourceImportRequestState,
} from './sourceImportRequestState';
import { buildSourceImportFailure } from './types';

describe('source import request transitions', () => {
  it('settles only the current attempt and cannot finish an idle or settled request', () => {
    const request = { scope: {} };
    const idle: SourceImportRequestState<number> = { status: 'idle' };
    const succeeded = { type: 'succeeded', request, value: 1 } as const;
    expect(transitionSourceImportRequest(idle, succeeded)).toBe(idle);
    const loading = transitionSourceImportRequest(idle, { type: 'started', request });
    const ready = transitionSourceImportRequest(loading, succeeded);
    expect(ready).toEqual({ status: 'succeeded', request, value: 1 });
    expect(
      transitionSourceImportRequest(ready, {
        type: 'failed',
        request,
        failure: buildSourceImportFailure('test-connection'),
      })
    ).toBe(ready);
  });

  it('ignores an old success and failure while a newer attempt is loading', () => {
    const oldRequest = { scope: {} };
    const request = { scope: {} };
    const loading: SourceImportRequestState<void> = { status: 'loading', request };
    expect(
      transitionSourceImportRequest(loading, {
        type: 'succeeded',
        request: oldRequest,
        value: undefined,
      })
    ).toBe(loading);
    expect(
      transitionSourceImportRequest(loading, {
        type: 'failed',
        request: oldRequest,
        failure: buildSourceImportFailure('load-source-objects'),
      })
    ).toBe(loading);
    const failure = buildSourceImportFailure('load-source-objects');
    expect(transitionSourceImportRequest(loading, { type: 'failed', request, failure })).toEqual({
      status: 'failed',
      request,
      failure,
    });
    expect(transitionSourceImportRequest(loading, { type: 'reset' })).toEqual({ status: 'idle' });
  });
});
