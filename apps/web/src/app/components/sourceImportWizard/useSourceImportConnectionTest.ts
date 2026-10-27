/** Owned concern: execute connection tests without changing catalogue discovery state. */
import { useMemo } from 'react';
import { toast } from 'sonner';

import type {
  IWarehouseSourceImportPort,
  TestWarehouseConnectionResult,
} from '../../ports/workspace';
import { resolveSourceImportFailureMessage, useSourceImportLocalization } from './copy';
import { buildSourceImportFailure, type SourceImportInitialSelection } from './types';
import { useSourceImportRequest } from './useSourceImportRequest';
import type { SourceImportConnectionTestBinding } from './sourceImportConnectionTest.binding';

export function useSourceImportConnectionTest(
  open: boolean,
  connectionId: string | null,
  binding: SourceImportInitialSelection | null | undefined,
  port: IWarehouseSourceImportPort
): SourceImportConnectionTestBinding {
  const { copy } = useSourceImportLocalization();
  const scope = useMemo(() => ({}), [open, connectionId, binding, port]);
  const { state, begin, succeed, fail, isCurrent } =
    useSourceImportRequest<TestWarehouseConnectionResult>(scope);
  const test = async () => {
    if (!open || !connectionId || state.status === 'loading') return;
    const request = begin();
    try {
      const result = await port.testWarehouseConnection(connectionId);
      succeed(request, result);
    } catch (error) {
      if (!isCurrent(request)) return;
      const failure = buildSourceImportFailure('test-connection', error);
      fail(request, failure);
      toast.error(resolveSourceImportFailureMessage(copy, failure));
    }
  };
  return { model: state, test };
}
