import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '../../queries/queryKeys';
import { refreshConnectionIdentityProjections } from './CanvasSourceImportDialogHost';

describe('CanvasSourceImportDialogHost connection identity refresh', () => {
  it('invalidates both active graph authority families after a connection rename', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await refreshConnectionIdentityProjections(queryClient);

    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.workspace.graphDraftRoot(),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.workspace.dbtProjectGraphRoot(),
    });
  });
});
