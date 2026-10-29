// @vitest-environment jsdom
/** Passive references must never outlive their exact Monaco document. */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  attachMonacoInlineReferences,
  type MonacoInlineReferences,
} from './monacoInlineReferences';

type Harness = Readonly<{
  editor: Parameters<typeof attachMonacoInlineReferences>[0];
  monaco: Parameters<typeof attachMonacoInlineReferences>[1];
  model: Readonly<{ getValue(): string }>;
  projection: MonacoInlineReferences;
  widgets: ReadonlyMap<string, unknown>;
  zones: ReadonlyMap<string, unknown>;
  listenerCount(): number;
  emit(name: string): void;
  changeText(value: string): void;
}>;

function createHarness(): Harness {
  let text = 'SELECT *\nFROM client;';
  const path = 'models/client_orders.sql';
  const listeners = new Map<string, Set<() => void>>();
  const widgets = new Map<string, { getId(): string; getDomNode(): HTMLElement }>();
  const zones = new Map<string, unknown>();
  const subscribe = (name: string) => (listener: () => void) => {
    const group = listeners.get(name) ?? new Set();
    group.add(listener);
    listeners.set(name, group);
    return { dispose: () => group.delete(listener) };
  };
  const positionAt = (offset: number): { lineNumber: number; column: number } => {
    const lines = text.slice(0, offset).split('\n');
    return { lineNumber: lines.length, column: lines.at(-1)!.length + 1 };
  };
  const offsetAt = (line: number, column: number): number =>
    text
      .split('\n')
      .slice(0, line - 1)
      .reduce((length, value) => length + value.length + 1, 0) +
    column -
    1;
  const model = {
    uri: { toString: () => path },
    getValue: () => text,
    getValueLength: () => text.length,
    getPositionAt: positionAt,
    getValueInRange: (range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    }) =>
      text.slice(
        offsetAt(range.startLineNumber, range.startColumn),
        offsetAt(range.endLineNumber, range.endColumn)
      ),
  };
  const editor = {
    getModel: () => model,
    getLayoutInfo: () => ({ contentLeft: 36, contentWidth: 600, height: 400 }),
    layoutOverlayWidget: vi.fn(),
    addOverlayWidget: (widget: { getId(): string; getDomNode(): HTMLElement }) => {
      widgets.set(widget.getId(), widget);
      document.body.append(widget.getDomNode());
    },
    removeOverlayWidget: (widget: { getId(): string }) => widgets.delete(widget.getId()),
    changeViewZones: (change: (accessor: unknown) => void) =>
      change({
        addZone: (zone: { onDomNodeTop(top: number): void }) => {
          const id = `zone-${zones.size}`;
          zones.set(id, zone);
          zone.onDomNodeTop(80);
          return id;
        },
        removeZone: (id: string) => zones.delete(id),
      }),
    onDidLayoutChange: subscribe('layout'),
    onDidScrollChange: subscribe('scroll'),
    onDidChangeModel: subscribe('model'),
    onDidChangeModelContent: subscribe('content'),
    onDidDispose: subscribe('dispose'),
  };
  const monaco = {
    Uri: { parse: (value: string) => ({ toString: () => value }) },
    Range: class {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number
      ) {}
    },
  };
  const projection: MonacoInlineReferences = {
    path,
    value: text,
    items: [
      {
        id: 'region-client',
        startOffset: text.indexOf('client'),
        endOffset: text.length - 1,
        sourceText: 'client',
        label: 'Client',
        kind: 'model',
        inputs: ['Raw clients'],
        outputLabel: 'Client',
        columnCount: 2,
      },
    ],
  };
  return {
    editor: editor as unknown as Parameters<typeof attachMonacoInlineReferences>[0],
    monaco: monaco as unknown as Parameters<typeof attachMonacoInlineReferences>[1],
    model,
    projection,
    widgets,
    zones,
    listenerCount: () => [...listeners.values()].reduce((count, group) => count + group.size, 0),
    emit: (name: string) => [...(listeners.get(name) ?? [])].forEach((listener) => listener()),
    changeText: (value: string) => {
      text = value;
      [...(listeners.get('content') ?? [])].forEach((listener) => listener());
    },
  };
}

afterEach(() => document.body.replaceChildren());

describe('passive Monaco inline references', () => {
  it('inspects an exact reference while retaining the existing document and editor', () => {
    const h = createHarness();
    const inspect = vi.fn();
    const attached = attachMonacoInlineReferences(h.editor, h.monaco, h.projection, inspect);
    const button = document.querySelector('button')!;
    button.click();
    expect(inspect).toHaveBeenCalledExactlyOnceWith('region-client');
    expect(h.editor.getModel()).toBe(h.model);
    expect(h.model.getValue()).toBe(h.projection.value);
    expect(h.zones.size).toBe(1);
    expect(h.widgets.size).toBe(1);
    expect(button.textContent).toContain('2');
    attached.dispose();
  });

  it('refuses a mismatched path, document, range, text or duplicate identity before attaching', () => {
    const h = createHarness();
    const item = h.projection.items[0]!;
    const invalid = [
      { ...h.projection, items: [] },
      { ...h.projection, path: 'models/other.sql' },
      { ...h.projection, value: 'different revision' },
      { ...h.projection, items: [{ ...item, startOffset: -1 }] },
      { ...h.projection, items: [{ ...item, endOffset: 999 }] },
      { ...h.projection, items: [{ ...item, sourceText: 'other' }] },
      { ...h.projection, items: [item, item] },
    ];
    for (const projection of invalid) {
      attachMonacoInlineReferences(h.editor, h.monaco, projection, vi.fn()).dispose();
      expect(h.widgets.size).toBe(0);
      expect(h.zones.size).toBe(0);
      expect(h.listenerCount()).toBe(0);
    }
  });

  it('removes stale cards synchronously on typing and releases their handlers exactly once', () => {
    const h = createHarness();
    const inspect = vi.fn();
    const attached = attachMonacoInlineReferences(h.editor, h.monaco, h.projection, inspect);
    const oldButton = document.querySelector('button')!;
    h.changeText(`${h.projection.value}\n-- edit`);
    expect(document.querySelector('.reference-card')).toBeNull();
    expect(h.widgets.size).toBe(0);
    expect(h.zones.size).toBe(0);
    expect(h.listenerCount()).toBe(0);
    oldButton.click();
    expect(inspect).not.toHaveBeenCalled();
    expect(() => {
      attached.dispose();
      h.emit('scroll');
      h.emit('layout');
    }).not.toThrow();
  });

  it('releases all owned resources on a model change or editor disposal', () => {
    for (const event of ['model', 'dispose']) {
      const h = createHarness();
      const attached = attachMonacoInlineReferences(h.editor, h.monaco, h.projection, vi.fn());
      h.emit(event);
      expect(document.querySelector('.reference-card')).toBeNull();
      expect(h.listenerCount()).toBe(0);
      attached.dispose();
    }
  });
});
