// @vitest-environment jsdom
/** Owned concern: prove sample reads require explicit intent and never cross object identity. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import type { SourceDataSample } from '../../ports/workspace';
import { SourceImportSample } from './SourceImportSample';

let root: Root;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

it('does not query on inspection, exposes localized failure, and ignores the previous object request', async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  let rejectPrevious!: (reason: unknown) => void;
  const previewSourceObjectRows = vi.fn(
    () =>
      new Promise<SourceDataSample>((_resolve, reject) => {
        rejectPrevious = reject;
      })
  );
  const services = {
    ...createAppServicesTestOverrides(),
    warehouseSourceDataSampleQuery: { previewSourceObjectRows },
  };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const view = (objectId: string): JSX.Element => (
    <AppServicesProvider overrides={services}>
      <SourceImportSample connectionId="warehouse" objectId={objectId} name={objectId} />
    </AppServicesProvider>
  );
  await act(async () => root.render(view('relation/db/raw/orders')));
  expect(previewSourceObjectRows).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'View sample' }));
  });
  expect(previewSourceObjectRows).toHaveBeenCalledExactlyOnceWith({
    connectionId: 'warehouse',
    objectId: 'relation/db/raw/orders',
    limit: 20,
  });
  await act(async () => root.render(view('relation/db/raw/client')));
  await act(async () =>
    rejectPrevious(new WarehouseSourceDataSampleQueryError('source_object_not_found'))
  );
  expect(screen.queryByRole('alert')).toBeNull();
  expect(previewSourceObjectRows).toHaveBeenCalledTimes(1);
  previewSourceObjectRows.mockRejectedValue(
    new WarehouseSourceDataSampleQueryError('source_object_not_found')
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'View sample' }));
  });
  expect(screen.getByRole('alert').textContent).toBe(
    'The source object is no longer available. Refresh the catalogue.'
  );
});
