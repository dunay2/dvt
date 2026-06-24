import { fireEvent, screen } from '@testing-library/dom';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasNodeContextMenuView } from './CanvasNodeContextMenuView';
import type { CanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';

vi.mock('../ui/context-menu', () => ({
  ContextMenuContent: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div role="menu" {...props}>
      {children}
    </div>
  ),
  ContextMenuItem: ({
    children,
    disabled,
    onSelect,
    title,
    variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    onSelect?: () => void;
    variant?: 'default' | 'destructive';
  }) => (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={title}
      data-variant={variant}
      onClick={onSelect}
      {...props}
    >
      {children}
    </button>
  ),
  ContextMenuLabel: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  ContextMenuSeparator: (props: HTMLAttributes<HTMLHRElement>) => (
    <hr role="separator" {...props} />
  ),
}));

const NODE_CONTEXT_MENU_MODEL: CanvasNodeContextMenuModel = {
  target: {
    kind: 'node',
    nodeId: 'model-orders',
    nodeName: 'Orders model',
  },
  actionGroups: [
    {
      id: 'workbench',
      label: 'Workbench',
      actions: [
        {
          id: 'inspect-node',
          label: 'Open workbench',
          intent: 'read',
          disabled: false,
        },
      ],
    },
    {
      id: 'execute',
      label: 'Execute',
      actions: [
        {
          id: 'select-node-for-execution',
          label: 'Select for execution',
          intent: 'command',
          disabled: false,
        },
      ],
    },
    {
      id: 'danger',
      label: 'Danger',
      actions: [
        {
          id: 'remove-node',
          label: 'Delete',
          intent: 'command',
          destructive: true,
          disabled: false,
        },
      ],
    },
  ],
};

describe('CanvasNodeContextMenuView', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('renders governed node actions without duplicating node workbench sections', () => {
    const onAction = vi.fn();

    act(() => {
      root.render(
        <CanvasNodeContextMenuView model={NODE_CONTEXT_MENU_MODEL} onAction={onAction} />
      );
    });

    expect(screen.getByRole('menu').getAttribute('data-slot')).toBe('canvas-node-context-menu');
    expect(screen.getByText('Orders model')).toBeTruthy();
    expect(screen.getByText('Execute')).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Open workbench' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Select for execution' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    });

    expect(onAction).toHaveBeenNthCalledWith(1, 'inspect-node');
    expect(onAction).toHaveBeenNthCalledWith(2, 'select-node-for-execution');
    expect(onAction).toHaveBeenNthCalledWith(3, 'remove-node');
    expect(screen.getByRole('menuitem', { name: 'Delete' }).getAttribute('data-variant')).toBe(
      'destructive'
    );

    expect(screen.queryByRole('menuitem', { name: 'Properties' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Inputs / Outputs' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Tests' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Edit SQL' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Preview node' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Run from here' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Show lineage' })).toBeNull();
  });
});
