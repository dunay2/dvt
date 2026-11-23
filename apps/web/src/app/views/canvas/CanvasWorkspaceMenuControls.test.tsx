// @vitest-environment jsdom

import { fireEvent, waitFor, within } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CanvasWorkspaceMenuContributionRegistrar,
  CanvasWorkspaceTopBarIdentity,
  CanvasWorkspaceMenuControls,
} from './CanvasWorkspaceMenuControls';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabs } from './CanvasWorkspaceModelTabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

describe('CanvasWorkspaceMenuControls', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container.remove();
    vi.clearAllMocks();
  });

  it('renders contributed project snapshot commands in the Workspace menu', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();
    const snapshotFile = new File(['{}'], 'project-snapshot.json', {
      type: 'application/json',
    });

    await act(async () => {
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Workspace</DropdownMenuTrigger>
          <DropdownMenuContent forceMount>
            <CanvasWorkspaceMenuContributionRegistrar
              canExportProjectSnapshot
              canImportProjectSnapshot
              canOpenProjectCode
              onExportProjectSnapshot={onExportProjectSnapshot}
              onImportProjectSnapshotFile={onImportProjectSnapshotFile}
            />
            <CanvasWorkspaceMenuControls />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    });

    await act(async () => {
      document.body
        .querySelector<HTMLDivElement>('[data-slot="canvas-workspace-export-command"]')
        ?.click();
    });

    expect(onExportProjectSnapshot).toHaveBeenCalledTimes(1);

    expect(
      document.querySelector('[data-slot="canvas-workspace-open-project-code-command"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-slot="canvas-workspace-explore-project-command"]')
    ).toBeNull();

    await act(async () => {
      fireEvent.change(
        document.body.querySelector<HTMLInputElement>(
          '[data-slot="canvas-workspace-import-input"]'
        )!,
        {
          target: { files: [snapshotFile] },
        }
      );
    });

    expect(onImportProjectSnapshotFile).toHaveBeenCalledWith(snapshotFile);
  });

  // Retiring the explorer dialog must preserve the existing canvas selection command.
  it('offers multiple canvases in Project and delegates selection without snapshot side effects', async () => {
    const select = vi.fn();
    const exportSnapshot = vi.fn();
    const documents = [
      { id: 'sales', title: 'Sales', kind: 'transformation' },
      { id: 'orders', title: 'Orders', kind: 'transformation' },
    ];
    await act(async () =>
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Project</DropdownMenuTrigger>
          <DropdownMenuContent>
            <CanvasWorkspaceMenuContributionRegistrar
              activeCanvas={documents[0]}
              canvasDocuments={documents}
              onSelectCanvas={select}
              canExportProjectSnapshot
              canImportProjectSnapshot={false}
              onExportProjectSnapshot={exportSnapshot}
            />
            <CanvasWorkspaceMenuControls />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    );
    const trigger = within(document.body).getByRole('menuitem', { name: 'Canvases' });
    await act(async () => {
      trigger.focus();
      fireEvent.keyDown(trigger, { key: 'ArrowRight' });
    });
    const orders = await waitFor(() =>
      within(document.body).getByRole('menuitemradio', { name: 'Orders' })
    );
    expect(
      within(document.body)
        .getByRole('menuitemradio', { name: 'Sales' })
        .getAttribute('aria-checked')
    ).toBe('true');
    await act(async () => fireEvent.click(orders));
    expect(select).toHaveBeenCalledExactlyOnceWith('orders');
    expect(exportSnapshot).not.toHaveBeenCalled();
  });

  it('keeps Model close tabbable outside the tablist and delegates to its existing owner', async () => {
    const closeModel = vi.fn();
    const closeCode = vi.fn();
    const selectModel = vi.fn();
    await act(async () =>
      root.render(
        <CanvasWorkspaceModelTabs
          canvasTitle="Sales"
          tab={{
            canvasId: 'sales',
            nodeId: 'model',
            label: 'Customers',
            active: true,
            onSelect: selectModel,
            onCanvas: vi.fn(),
            onClose: closeModel,
          }}
          codeTab={{ active: false, onSelect: vi.fn(), onCanvas: vi.fn(), onClose: closeCode }}
        />
      )
    );
    const close = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-model-tab-close"]'
    )!;
    expect(close.tabIndex).toBe(0);
    expect(close.closest('[role="tablist"]')).toBeNull();
    const tablist = within(container).getByRole('tablist');
    expect(
      Array.from(tablist.querySelectorAll('button'), (button) => button.getAttribute('role'))
    ).toEqual(['tab', 'tab', 'tab']);
    await act(async () => fireEvent.click(close));
    expect(closeModel).toHaveBeenCalledExactlyOnceWith();
    expect(closeCode).not.toHaveBeenCalled();
    expect(selectModel).not.toHaveBeenCalled();
  });

  it('renders the active Canvas identity as minimal shell top-bar context', async () => {
    await act(async () => {
      root.render(
        <>
          <CanvasWorkspaceMenuContributionRegistrar
            activeCanvas={{
              id: 'warehouse-canvas',
              kind: 'transformation',
              title: 'Warehouse project',
            }}
            canExportProjectSnapshot
            canImportProjectSnapshot
            onExportProjectSnapshot={vi.fn()}
            onImportProjectSnapshotFile={vi.fn()}
          />
          <CanvasWorkspaceTopBarIdentity />
        </>
      );
    });

    const activeCanvasIdentity = container.querySelector(
      '[data-slot="shell-active-canvas-identity"]'
    );

    expect(activeCanvasIdentity).not.toBeNull();
    expect(activeCanvasIdentity?.textContent).toBe('Warehouse project');
    expect(activeCanvasIdentity?.getAttribute('data-canvas-id')).toBe('warehouse-canvas');
    expect(activeCanvasIdentity?.getAttribute('data-kind')).toBe('transformation');
    expect(container.textContent).not.toContain('Export');
    expect(container.textContent).not.toContain('Import');
  });

  it.each(['canvas', 'model'] as const)(
    'activates the selected %s tab once when a pointer gesture also moves focus',
    async (kind) => {
      const select = vi.fn();
      await act(async () =>
        root.render(
          <CanvasWorkspaceModelTabs
            canvasTitle="Sales"
            onShowCanvas={select}
            tab={{
              canvasId: 'sales',
              nodeId: 'model',
              label: 'Customers',
              active: kind === 'model',
              onSelect: select,
              onCanvas: select,
              onClose: vi.fn(),
            }}
          />
        )
      );
      const tab = container.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')!;
      await act(async () => {
        fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
        tab.focus();
      });
      expect(select).toHaveBeenCalledExactlyOnceWith();
      select.mockClear();
      await act(async () => fireEvent.mouseDown(tab, { button: 0, ctrlKey: false }));
      expect(select).toHaveBeenCalledExactlyOnceWith();
      select.mockClear();
      await act(async () => {
        fireEvent.mouseDown(tab, { button: 2 });
        fireEvent.mouseDown(tab, { button: 0, ctrlKey: true });
      });
      expect(select).not.toHaveBeenCalled();
    }
  );

  it('selects each inactive destination once and retains keyboard reentry without repeating Code', async () => {
    const select = vi.fn();
    function WorkspaceTabs(): JSX.Element {
      const [active, setActive] = React.useState('canvas');
      const activate = (key: string): void => {
        select(key);
        setActive(key);
      };
      return (
        <CanvasWorkspaceModelTabs
          canvasTitle="Sales"
          onShowCanvas={() => activate('canvas')}
          codeTab={{
            active: active === 'code',
            onSelect: () => activate('code'),
            onCanvas: vi.fn(),
          }}
          tab={{
            canvasId: 'sales',
            nodeId: 'model',
            label: 'Customers',
            active: active === 'model',
            onSelect: () => activate('model'),
            onCanvas: vi.fn(),
            onClose: vi.fn(),
          }}
        />
      );
    }
    await act(async () => root.render(<WorkspaceTabs />));
    for (const label of ['Customers', 'Code', 'Sales']) {
      const tab = within(container).getByRole('tab', { name: label });
      select.mockClear();
      await act(async () => fireEvent.mouseDown(tab, { button: 0, ctrlKey: false }));
      await act(async () => tab.focus());
      expect(select).toHaveBeenCalledTimes(1);
    }
    const model = within(container).getByRole('tab', { name: 'Customers' });
    select.mockClear();
    await act(async () => model.focus());
    expect(select).toHaveBeenCalledExactlyOnceWith('model');
    select.mockClear();
    await act(async () => {
      model.blur();
      model.focus();
    });
    expect(select).toHaveBeenCalledExactlyOnceWith('model');
    const code = within(container).getByRole('tab', { name: 'Code' });
    await act(async () => fireEvent.mouseDown(code, { button: 0, ctrlKey: false }));
    select.mockClear();
    await act(async () => fireEvent.mouseDown(code, { button: 0, ctrlKey: false }));
    expect(select).not.toHaveBeenCalled();
  });

  it('reveals the selected tab on entry and resize and releases its observer on exit', async () => {
    let selectedLeft = 160;
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const left = this.getAttribute('aria-selected') === 'true' ? selectedLeft : 0;
      return {
        left,
        right: left + 100,
        top: 0,
        bottom: 30,
        width: 100,
        height: 30,
        x: left,
        y: 0,
        toJSON: () => ({}),
      };
    });
    const disconnect = vi.fn();
    let resize: (() => void) | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      }
    );
    try {
      await act(async () => root.render(<CanvasWorkspaceModelTabs canvasTitle="Sales" />));
      const strip = container.querySelector<HTMLDivElement>('.canvas-workspace-model-tabs')!;
      expect(strip.scrollLeft).toBe(160);
      selectedLeft = -40;
      resize?.();
      expect(strip.scrollLeft).toBe(120);
      await act(async () => root.render(null));
      expect(disconnect).toHaveBeenCalledOnce();
    } finally {
      rect.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('observes the workspace tab strip once when it is mounted inside the shell identity', async () => {
    useCanvasWorkspaceMenuContributionStore.getState().registerCanvasWorkspaceMenuContribution({
      activeCanvas: { id: 'sales', kind: 'transformation', title: 'Sales' },
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
    });
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        disconnect = disconnect;
      }
    );
    try {
      await act(async () => root.render(<CanvasWorkspaceTopBarIdentity />));
      expect(observe).toHaveBeenCalledExactlyOnceWith(
        container.querySelector('.canvas-workspace-model-tabs')
      );
      await act(async () => root.render(null));
      expect(disconnect).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ['en', 'Code'],
    ['es', 'Código'],
  ] as const)(
    'projects the top Code command in the configured language (%s)',
    async (language, label) => {
      useApplicationLanguageStore.getState().configureApplicationLanguage(language);
      const selectCode = vi.fn();
      const showCanvas = vi.fn();
      await act(async () =>
        root.render(
          <>
            <CanvasWorkspaceMenuContributionRegistrar
              activeCanvas={{ id: 'sales', kind: 'transformation', title: 'Sales' }}
              canExportProjectSnapshot={false}
              canImportProjectSnapshot={false}
              codeTab={{ active: false, onSelect: selectCode, onCanvas: showCanvas }}
            />
            <CanvasWorkspaceTopBarIdentity />
          </>
        )
      );
      const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Sales', label]);
      await act(async () => fireEvent.mouseDown(tabs[1]!, { button: 0, ctrlKey: false }));
      expect(selectCode).toHaveBeenCalledExactlyOnceWith();
      await act(async () => fireEvent.mouseDown(tabs[0]!, { button: 0, ctrlKey: false }));
      expect(showCanvas).toHaveBeenCalledExactlyOnceWith();
    }
  );
  it.each([
    ['en', 'Close: Code'],
    ['es', 'Cerrar: Código'],
  ] as const)('closes Code through the current command in %s', async (language, closeLabel) => {
    useApplicationLanguageStore.getState().configureApplicationLanguage(language);
    const selectCode = vi.fn();
    const showCanvas = vi.fn();
    const closeCode = vi.fn();
    const render = async (onClose?: () => void): Promise<void> =>
      act(async () =>
        root.render(
          <>
            <CanvasWorkspaceMenuContributionRegistrar
              activeCanvas={{ id: 'sales', kind: 'transformation', title: 'Sales' }}
              canExportProjectSnapshot={false}
              canImportProjectSnapshot={false}
              codeTab={{ active: true, onSelect: selectCode, onCanvas: showCanvas, onClose }}
            />
            <CanvasWorkspaceTopBarIdentity />
          </>
        )
      );
    await render(closeCode);
    const close = within(container).getByRole('button', { name: closeLabel });
    const code = container.querySelector('[data-slot="canvas-code-main-tab"]')!;
    expect(close.closest('[role="tab"]')).toBeNull();
    expect(close.closest('[role="tablist"]')).toBeNull();
    expect(close.getAttribute('tabindex')).toBe('-1');
    expect(code.getAttribute('aria-keyshortcuts')).toBe('Delete');
    await act(async () => fireEvent.click(close));
    expect(closeCode).toHaveBeenCalledExactlyOnceWith();
    const replacement = vi.fn();
    await render(replacement);
    const globalDelete = vi.fn();
    document.addEventListener('keydown', globalDelete);
    try {
      await act(async () => fireEvent.keyDown(code, { key: 'Delete' }));
      expect(replacement).toHaveBeenCalledExactlyOnceWith();
      expect(globalDelete).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', globalDelete);
    }
    expect(selectCode).not.toHaveBeenCalled();
    expect(showCanvas).not.toHaveBeenCalled();
    await render();
    expect(within(container).queryByRole('button', { name: closeLabel })).toBeNull();
    expect(code.getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('renders project commands and active Canvas context in the configured language', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    await act(async () => {
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Espacio de trabajo</DropdownMenuTrigger>
          <DropdownMenuContent forceMount>
            <CanvasWorkspaceMenuContributionRegistrar
              activeCanvas={{ id: 'transformaciones', kind: 'transformation', title: 'Ventas' }}
              canExportProjectSnapshot
              canImportProjectSnapshot
              canOpenProjectCode
              onExportProjectSnapshot={vi.fn()}
              onImportProjectSnapshotFile={vi.fn()}
              onOpenProjectCode={vi.fn()}
            />
            <CanvasWorkspaceMenuControls />
            <CanvasWorkspaceTopBarIdentity />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    });

    expect(document.body.textContent).not.toContain('Importar proyecto dbt');
    expect(document.body.textContent).not.toContain('Acciones del proyecto');
    expect(document.body.textContent).toContain('Instantáneas del proyecto');
    expect(document.body.textContent).not.toContain('Explorar proyecto');
    expect(document.body.textContent).not.toContain('Abrir código del proyecto');
    expect(document.body.textContent).not.toContain('Open project code');
    expect(
      document.body
        .querySelector('[data-slot="shell-active-canvas-identity"]')
        ?.getAttribute('aria-label')
    ).toBe('Canvas activo: Ventas');
    expect(
      document.body.querySelector('[data-slot="shell-active-canvas-identity"]')?.textContent
    ).toBe('Ventas');
  });

  it('does not let a stale Workspace menu cleanup clear an active replacement contribution', async () => {
    const staleContribution = {
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
      canOpenProjectCode: false,
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
      onOpenProjectCode: vi.fn(),
    };
    const activeContribution = {
      canExportProjectSnapshot: true,
      canImportProjectSnapshot: true,
      canOpenProjectCode: true,
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
      onOpenProjectCode: vi.fn(),
    };

    const { registerCanvasWorkspaceMenuContribution, clearCanvasWorkspaceMenuContribution } =
      useCanvasWorkspaceMenuContributionStore.getState();

    registerCanvasWorkspaceMenuContribution(staleContribution);
    registerCanvasWorkspaceMenuContribution(activeContribution);
    clearCanvasWorkspaceMenuContribution(staleContribution);

    await waitFor(() => {
      expect(useCanvasWorkspaceMenuContributionStore.getState().contribution).toBe(
        activeContribution
      );
    });

    clearCanvasWorkspaceMenuContribution(activeContribution);

    expect(useCanvasWorkspaceMenuContributionStore.getState().contribution).toBeNull();
  });

  it('keeps one registered snapshot while parent callback identities change', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();

    const renderRegistrar = (onOpenProjectCode: () => void): React.ReactElement => (
      <CanvasWorkspaceMenuContributionRegistrar
        canExportProjectSnapshot={false}
        canImportProjectSnapshot={false}
        onExportProjectSnapshot={onExportProjectSnapshot}
        onImportProjectSnapshotFile={onImportProjectSnapshotFile}
        onOpenProjectCode={onOpenProjectCode}
      />
    );

    const firstCommand = vi.fn();
    await act(async () => {
      root.render(renderRegistrar(firstCommand));
    });
    const firstContribution = useCanvasWorkspaceMenuContributionStore.getState().contribution;

    const latestCommand = vi.fn();
    await act(async () => {
      root.render(renderRegistrar(latestCommand));
    });

    const latestContribution = useCanvasWorkspaceMenuContributionStore.getState().contribution;
    expect(latestContribution).toBe(firstContribution);
    latestContribution?.onOpenProjectCode?.();
    expect(firstCommand).not.toHaveBeenCalled();
    expect(latestCommand).toHaveBeenCalledTimes(1);
  });
});
