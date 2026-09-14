// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, getByLabelText } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionRef, DvtTransformResultTargetV1 } from '@dvt/contracts';

import { DvtTransformResultTargetFields } from './DvtTransformResultTargetFields';
import { canvasViewCopy } from './copy';

const connectionRef: ConnectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
};
let value: DvtTransformResultTargetV1 | null | undefined;
function Harness({
  connection = connectionRef,
  disabled = false,
}: {
  connection?: ConnectionRef | null;
  disabled?: boolean;
}): JSX.Element {
  const [target, setTarget] = useState<DvtTransformResultTargetV1 | null>();
  value = target;
  return (
    <DvtTransformResultTargetFields
      target={target}
      connection={connection ?? undefined}
      disabled={disabled}
      onChange={setTarget}
    />
  );
}

describe('Explicit result target form', () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it('requires explicit selection, starts with blank names, and can remove the target', () => {
    act(() => root.render(<Harness />));
    const select = getByLabelText(
      host,
      canvasViewCopy.inspectorDvtConnectionLabel
    ) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(value).toBeUndefined();
    act(() => fireEvent.change(select, { target: { value: connectionRef.connectionId } }));
    expect(value).toMatchObject({ connectionRef, schema: '', relation: '' });
    act(() =>
      fireEvent.change(getByLabelText(host, canvasViewCopy.inspectorDvtSchemaLabel), {
        target: { value: 'analytics' },
      })
    );
    act(() =>
      fireEvent.change(getByLabelText(host, canvasViewCopy.inspectorDvtTableLabel), {
        target: { value: 'orders_enriched' },
      })
    );
    expect(value).toMatchObject({ schema: 'analytics', relation: 'orders_enriched' });
    act(() => fireEvent.change(select, { target: { value: '' } }));
    expect(value).toBeNull();
  });

  it('keeps the saved connection when the input candidate changes or disappears', () => {
    act(() => root.render(<Harness />));
    act(() =>
      fireEvent.change(getByLabelText(host, canvasViewCopy.inspectorDvtConnectionLabel), {
        target: { value: connectionRef.connectionId },
      })
    );
    act(() =>
      root.render(<Harness connection={{ ...connectionRef, connectionId: 'warehouse-b' }} />)
    );
    expect(value?.connectionRef).toEqual(connectionRef);
    act(() => root.render(<Harness connection={null} />));
    expect(
      (getByLabelText(host, canvasViewCopy.inspectorDvtConnectionLabel) as HTMLSelectElement).value
    ).toBe(connectionRef.connectionId);
    expect(value?.connectionRef).toEqual(connectionRef);
  });

  it('does not offer a connection when its inputs are ambiguous', () => {
    act(() => root.render(<Harness connection={null} />));
    const select = getByLabelText(
      host,
      canvasViewCopy.inspectorDvtConnectionLabel
    ) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.options.length).toBe(1);
    expect(value).toBeUndefined();
  });

  it('honors read-only mode', () => {
    act(() => root.render(<Harness disabled />));
    expect(
      (getByLabelText(host, canvasViewCopy.inspectorDvtConnectionLabel) as HTMLSelectElement)
        .disabled
    ).toBe(true);
    expect(value).toBeUndefined();
  });
});
