import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { beforeEach, afterEach } from 'vitest';
export function input(
  nodeId: string,
  table: string,
  dataType = 'text',
  joinDataType: CanvasDvtCompositionInput['fields'][number]['joinDataType'] = 'string'
): CanvasDvtCompositionInput {
  return {
    nodeId,
    schema: 'raw',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse-main',
      },
      sourceObjectId: `raw.${table}`,
    },
    fields: [{ name: 'id', dataType, joinDataType }],
  };
}
export function inputOnConnection(
  nodeId: string,
  table: string,
  provider: 'postgres' | 'snowflake',
  connectionId: string
): CanvasDvtCompositionInput {
  const value = input(nodeId, table);
  return {
    ...value,
    sourceRef: {
      ...value.sourceRef,
      connectionRef: { ...value.sourceRef.connectionRef, provider, connectionId },
    },
  };
}
export function buttonWithText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (button == null) throw new Error(`Expected button '${text}'.`);
  return button;
}
export function useCompositionStartHarness() {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  return {
    get container() {
      return container;
    },
    get root() {
      return root;
    },
  };
}
