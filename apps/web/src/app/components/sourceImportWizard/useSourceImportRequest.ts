/** Owned concern: bind a source-import request machine to its active React scope. */
import { useCallback, useEffect, useMemo, useReducer } from 'react';

import {
  transitionSourceImportRequest,
  type SourceImportRequestIdentity,
  type SourceImportRequestState,
} from './sourceImportRequestState';
import type { SourceImportFailure } from './types';

export function useSourceImportRequest<T>(scope: object) {
  const lifetime = useMemo(
    () => ({ active: false, pending: null as SourceImportRequestIdentity | null }),
    [scope]
  );
  const [state, dispatch] = useReducer(transitionSourceImportRequest<T>, { status: 'idle' });
  useEffect(() => {
    lifetime.active = true;
    dispatch({ type: 'reset' });
    return () => {
      lifetime.active = false;
      lifetime.pending = null;
    };
  }, [lifetime]);
  const isCurrent = useCallback(
    (request: SourceImportRequestIdentity) => lifetime.active && lifetime.pending === request,
    [lifetime]
  );
  const begin = useCallback(() => {
    const request = { scope };
    lifetime.pending = request;
    dispatch({ type: 'started', request });
    return request;
  }, [lifetime, scope]);
  const succeed = useCallback(
    (request: SourceImportRequestIdentity, value: T) => {
      if (!isCurrent(request)) return;
      dispatch({ type: 'succeeded', request, value });
    },
    [isCurrent]
  );
  const fail = useCallback(
    (request: SourceImportRequestIdentity, failure: SourceImportFailure) => {
      if (!isCurrent(request)) return;
      dispatch({ type: 'failed', request, failure });
    },
    [isCurrent]
  );
  const currentState: SourceImportRequestState<T> =
    state.status === 'idle' || state.request.scope === scope ? state : { status: 'idle' };
  return { state: currentState, begin, succeed, fail, isCurrent };
}
