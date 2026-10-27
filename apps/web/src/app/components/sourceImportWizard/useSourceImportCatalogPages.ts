/** Owned concern: isolate concurrent catalogue-page requests and their failures by scope and key. */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildSourceImportFailure, type SourceImportFailure } from './types';

export function useSourceImportCatalogPages(scope: object) {
  const requests = useMemo(() => new Map<string, object>(), [scope]);
  const [failures, setFailures] = useState<
    ReadonlyMap<string, Readonly<{ scope: object; failure: SourceImportFailure }>>
  >(new Map());
  const forget = useCallback(
    (key: string) => {
      requests.delete(key);
      setFailures((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    },
    [requests]
  );
  useEffect(() => {
    setFailures(new Map());
    return () => requests.clear();
  }, [requests]);
  const begin = useCallback(
    (key: string) => {
      forget(key);
      const identity = {};
      requests.set(key, identity);
      const isCurrent = () => requests.get(key) === identity;
      return {
        isCurrent,
        reject(error: unknown) {
          if (!isCurrent()) return;
          setFailures((current) =>
            new Map(current).set(key, {
              scope,
              failure: buildSourceImportFailure('load-source-objects', error),
            })
          );
        },
      };
    },
    [forget, requests, scope]
  );
  const failure = [...failures.values()].find((entry) => entry.scope === scope)?.failure ?? null;
  return { begin, forget, failure };
}
