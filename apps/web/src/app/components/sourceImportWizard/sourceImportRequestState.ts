/** Owned concern: accept only transitions belonging to the current source-import request. */
import type { SourceImportFailure } from './types';

export type SourceImportRequestIdentity = Readonly<{ scope: object }>;

export type SourceImportRequestState<T> =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading'; request: SourceImportRequestIdentity }>
  | Readonly<{ status: 'succeeded'; request: SourceImportRequestIdentity; value: T }>
  | Readonly<{
      status: 'failed';
      request: SourceImportRequestIdentity;
      failure: SourceImportFailure;
    }>;

export type SourceImportRequestEvent<T> =
  | Readonly<{ type: 'reset' }>
  | Readonly<{ type: 'started'; request: SourceImportRequestIdentity }>
  | Readonly<{ type: 'succeeded'; request: SourceImportRequestIdentity; value: T }>
  | Readonly<{
      type: 'failed';
      request: SourceImportRequestIdentity;
      failure: SourceImportFailure;
    }>;

export function transitionSourceImportRequest<T>(
  state: SourceImportRequestState<T>,
  event: SourceImportRequestEvent<T>
): SourceImportRequestState<T> {
  switch (event.type) {
    case 'reset':
      return { status: 'idle' };
    case 'started':
      return { status: 'loading', request: event.request };
    case 'succeeded':
    case 'failed':
      if (state.status !== 'loading' || state.request !== event.request) return state;
      return event.type === 'succeeded'
        ? { status: 'succeeded', request: event.request, value: event.value }
        : { status: 'failed', request: event.request, failure: event.failure };
  }
}
