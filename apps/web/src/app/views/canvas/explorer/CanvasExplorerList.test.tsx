// @vitest-environment jsdom
/** Owned concern: project catalogue controls keep disclosure separate from placement. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen, within } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerList } from './CanvasExplorerList';
import type { CanvasExplorerItem } from './canvasExplorerItems';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  useApplicationLanguageStore.setState({ language: 'en' });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const items: readonly CanvasExplorerItem[] = [
  {
    id: 'source',
    label: 'Orders',
    isSource: true,
    details: [
      { label: 'object', value: 'raw.orders' },
      { label: 'connection', value: 'Warehouse North' },
    ],
  },
  {
    id: 'logical',
    label: 'Orders',
    description: 'models/orders.sql',
    details: [{ label: 'file', value: 'models/orders.sql' }],
  },
];

it('discloses real metadata without activating an unavailable model', () => {
  // Placement ACL must not prevent inspecting the catalogue's already-authorized metadata.
  const onSelect = vi.fn();
  const onDragStart = vi.fn();
  act(() =>
    root.render(
      <CanvasExplorerList
        items={[{ ...items[0]!, disabled: true }]}
        onSelect={onSelect}
        onDragStart={onDragStart}
      />
    )
  );
  expect((screen.getByRole('button', { name: 'Orders' }) as HTMLButtonElement).disabled).toBe(true);
  const disclosure = screen.getByRole('button', { name: 'Details: Orders' });
  act(() => {
    disclosure.focus();
    fireEvent.click(disclosure);
  });
  expect(disclosure.getAttribute('aria-expanded')).toBe('true');
  expect(document.getElementById(disclosure.getAttribute('aria-controls')!)?.textContent).toContain(
    'raw.orders'
  );
  expect(screen.getByText('Warehouse North')).toBeTruthy();
  expect(document.activeElement).toBe(disclosure);
  expect(onSelect).not.toHaveBeenCalled();
  expect(onDragStart).not.toHaveBeenCalled();
  expect(container.querySelector('button button')).toBeNull();
});

it('inspects only a single click and keeps keyboard activation immediate', () => {
  // The first browser click must remain cancellable: double click may never open Properties.
  vi.useFakeTimers();
  const onSelect = vi.fn();
  act(() => root.render(<CanvasExplorerList items={[items[0]!]} onSelect={onSelect} />));
  const row = screen.getByRole('button', { name: 'Orders' });
  act(() => {
    fireEvent.click(row, { detail: 1 });
    fireEvent.click(row, { detail: 2 });
    fireEvent.doubleClick(row);
  });
  act(() => vi.runAllTimers());
  expect(onSelect).not.toHaveBeenCalled();
  expect(row.getAttribute('aria-pressed')).toBe('false');
  act(() => fireEvent.click(row, { detail: 1 }));
  expect(onSelect).not.toHaveBeenCalled();
  act(() => vi.runAllTimers());
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('source');
  act(() => {
    fireEvent.click(row, { detail: 0 });
  });
  expect(onSelect).toHaveBeenCalledTimes(2);
});

it('reflects admitted inspection selection without optimistic local selection', () => {
  // A cancelled file-editor handoff must leave the previous Properties selection intact.
  const onSelect = vi.fn();
  act(() => root.render(<CanvasExplorerList items={[items[0]!]} onSelect={onSelect} />));
  const row = screen.getByRole('button', { name: 'Orders' });
  act(() => fireEvent.click(row, { detail: 0 }));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith('source');
  expect(row.getAttribute('aria-pressed')).toBe('false');
  act(() =>
    root.render(
      <CanvasExplorerList items={[{ ...items[0]!, selected: true }]} onSelect={onSelect} />
    )
  );
  expect(row.getAttribute('aria-pressed')).toBe('true');
});

it('cancels pending inspection when a real drag or catalogue replacement supersedes it', () => {
  // Drag must only emit the existing payload; it must not leave an inspect timer behind.
  vi.useFakeTimers();
  const onSelect = vi.fn();
  const onDragStart = vi.fn();
  act(() =>
    root.render(
      <CanvasExplorerList
        items={[{ ...items[0]!, draggable: true }]}
        onSelect={onSelect}
        onDragStart={onDragStart}
      />
    )
  );
  const row = screen.getByRole('button', { name: 'Orders' });
  act(() => {
    fireEvent.click(row, { detail: 1 });
    fireEvent.dragStart(row);
    vi.runAllTimers();
  });
  expect(onDragStart).toHaveBeenCalledExactlyOnceWith('source', expect.anything());
  expect(onSelect).not.toHaveBeenCalled();
  act(() => fireEvent.click(row, { detail: 1 }));
  act(() => root.render(<CanvasExplorerList items={[items[1]!]} onSelect={onSelect} />));
  act(() => vi.runAllTimers());
  expect(onSelect).not.toHaveBeenCalled();
  act(() =>
    root.render(<CanvasExplorerList key="scope-a" items={[items[0]!]} onSelect={onSelect} />)
  );
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Orders' }), { detail: 1 }));
  act(() =>
    root.render(<CanvasExplorerList key="scope-b" items={[items[0]!]} onSelect={onSelect} />)
  );
  act(() => vi.runAllTimers());
  expect(onSelect).not.toHaveBeenCalled();
});

it('searches metadata and the localized Source property in one identity-preserving list', () => {
  // Equal display names and source properties must not split the project catalogue into entity types.
  act(() => root.render(<CanvasExplorerList items={items} onSelect={vi.fn()} />));
  expect(screen.getByRole('button', { name: 'Models' }).textContent).toContain('2');
  expect(container.querySelectorAll('[data-model-icon]')).toHaveLength(2);
  expect(
    new Set(
      Array.from(container.querySelectorAll('[data-model-icon]'), (icon) =>
        icon.getAttribute('data-model-icon')
      )
    ).size
  ).toBe(1);
  const search = screen.getByRole('searchbox');
  act(() => {
    fireEvent.change(search, { target: { value: 'warehouse north' } });
  });
  expect(container.querySelectorAll('[data-element-id]')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Models' }).textContent).toContain('1');
  act(() => {
    useApplicationLanguageStore.setState({ language: 'es' });
    fireEvent.change(search, { target: { value: 'fuente' } });
  });
  expect(container.querySelector('[data-element-id]')?.getAttribute('data-element-id')).toBe(
    'source'
  );
  expect(screen.getByText('Fuente')).toBeTruthy();
  act(() => {
    fireEvent.change(search, { target: { value: 'unmatched' } });
  });
  expect(screen.getByText('No hay coincidencias.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Modelos' }).textContent).toContain('0');
});

it('retains search and detail disclosure without coupling them to model selection', () => {
  // Refreshing catalogue items used to discard local navigation state or issue a graph command.
  const onSelect = vi.fn();
  act(() => root.render(<CanvasExplorerList items={items} onSelect={onSelect} />));
  act(() => {
    fireEvent.click(screen.getAllByRole('button', { name: 'Details: Orders' })[0]!);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'raw.orders' } });
  });
  act(() => root.render(<CanvasExplorerList items={[...items]} onSelect={onSelect} />));
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('raw.orders');
  expect(
    screen.getByRole('button', { name: 'Details: Orders' }).getAttribute('aria-expanded')
  ).toBe('true');
  expect(onSelect).not.toHaveBeenCalled();
});

it('keeps connection controls outside Models and preserves the existing creation callbacks', () => {
  // Connection management and model creation retain separate existing command adapters.
  const onAddModel = vi.fn();
  const onImport = vi.fn();
  act(() =>
    root.render(
      <CanvasExplorerList
        items={[]}
        onSelect={vi.fn()}
        onAddModel={onAddModel}
        onImport={onImport}
        connections={<section aria-label="Project connections">Connections content</section>}
      />
    )
  );
  expect(
    within(screen.getByRole('region', { name: 'Project connections' })).getByText(
      'Connections content'
    )
  ).toBeTruthy();
  const add = screen.getByRole('button', { name: 'Add model' });
  act(() => {
    fireEvent.click(add);
  });
  expect(onAddModel).toHaveBeenCalledExactlyOnceWith(add);
  expect(onImport).not.toHaveBeenCalled();
  expect(screen.queryByRole('heading', { name: 'Sources' })).toBeNull();
});

it('distinguishes an unknown model count from a successful empty result', () => {
  // Pending or rejected file discovery must not claim the complete project contains zero models.
  act(() =>
    root.render(
      <CanvasExplorerList
        items={[]}
        onSelect={vi.fn()}
        countKnown={false}
        pending
        status={<p role="status">Loading project models…</p>}
      />
    )
  );
  expect(container.querySelector('[data-slot="canvas-explorer-model-count"]')).toBeNull();
  expect(screen.queryByText('No models yet.')).toBeNull();
  expect(
    container.querySelector('[data-slot="canvas-explorer-models"]')?.getAttribute('aria-busy')
  ).toBe('true');
  expect(screen.getByRole('status').textContent).toBe('Loading project models…');
  act(() => root.render(<CanvasExplorerList items={[]} onSelect={vi.fn()} />));
  expect(container.querySelector('[data-slot="canvas-explorer-model-count"]')?.textContent).toBe(
    '0'
  );
  expect(screen.getByText('No models yet.')).toBeTruthy();
});

it('keeps the full model name and Source facet in a wrapping title group', () => {
  // Native proof at the retained dock width exposed a fixed badge column squeezing Customers into letter fragments.
  act(() =>
    root.render(
      <CanvasExplorerList
        items={[
          {
            id: 'customer',
            label: 'Customers',
            isSource: true,
            details: [{ label: 'identifier', value: 'catalog-client' }],
          },
        ]}
        onSelect={vi.fn()}
      />
    )
  );
  const name = screen.getByText('Customers');
  const facet = screen.getByText('Source');
  expect(name.parentElement?.getAttribute('data-slot')).toBe('canvas-explorer-model-title');
  expect(facet.closest('[data-slot="canvas-explorer-model-title"]')).toBe(name.parentElement);
  expect(screen.getByRole('button', { name: 'Customers' }).getAttribute('aria-describedby')).toBe(
    facet.id
  );
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Details: Customers' }));
  });
  expect(screen.getByText('Identifier').tagName).toBe('DT');
  expect(screen.getByText('catalog-client').tagName).toBe('DD');
});

it('keeps collapsed rows compact while exposing independent real Source and SQL facets', () => {
  // The visual reference puts metadata behind detail disclosure; format must remain an admitted file fact.
  act(() =>
    root.render(
      <CanvasExplorerList
        items={[
          {
            id: 'file-source',
            label: 'Customers',
            description: 'models/customers.sql',
            isSource: true,
            definitionFormat: 'sql',
            details: [{ label: 'file', value: 'models/customers.sql' }],
          },
          { id: 'inline', label: 'Inline SQL', description: 'An unbound logical definition' },
        ]}
        onSelect={vi.fn()}
      />
    )
  );
  const row = screen.getByRole('button', { name: 'Customers models/customers.sql' });
  expect(row.textContent).not.toContain('models/customers.sql');
  expect(row.title).toBe('Customers · models/customers.sql');
  const source = within(row).getByText('Source');
  const format = within(row).getByText('SQL');
  expect(source.parentElement).toBe(format.parentElement);
  expect(row.getAttribute('aria-describedby')?.split(' ')).toEqual([source.id, format.id]);
  expect(
    within(
      screen.getByRole('button', { name: 'Inline SQL An unbound logical definition' })
    ).queryByText('SQL')
  ).toBeNull();
  act(() => {
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'models/customers.sql' } });
  });
  expect(screen.getByRole('button', { name: 'Customers models/customers.sql' })).toBe(row);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Details: Customers' }));
  });
  expect(screen.getByText('models/customers.sql').tagName).toBe('DD');
});
