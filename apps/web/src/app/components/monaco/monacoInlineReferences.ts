/** Owned concern: display passive, revision-bound references on an existing Monaco editor. */
import type { editor } from 'monaco-editor';

export type MonacoInlineReference = Readonly<{
  id: string;
  startOffset: number;
  endOffset: number;
  sourceText: string;
  label: string;
  kind: 'model' | 'source';
  inputs: readonly string[];
  outputLabel: string;
  columnCount?: number;
}>;

export type MonacoInlineReferenceCopy = Readonly<{
  inputsLabel: string;
  outputLabel: string;
  inspectLabel: string;
  inspectAriaPrefix: string;
  fieldsLabel: string;
  modelLabel: string;
  sourceLabel: string;
}>;

export type MonacoInlineReferences = Readonly<{
  path: string;
  value: string;
  items: readonly MonacoInlineReference[];
  copy?: Partial<MonacoInlineReferenceCopy>;
}>;

type CardRecord = {
  node: HTMLElement;
  button: HTMLButtonElement;
  inspect: () => void;
  lineNumber: number;
  top: number | null;
  left: number;
  zoneId: string | null;
  widget: editor.IOverlayWidget;
};

const DEFAULT_COPY: MonacoInlineReferenceCopy = {
  inputsLabel: 'Inputs',
  outputLabel: 'Output',
  inspectLabel: 'Inspect definition',
  inspectAriaPrefix: 'Inspect definition of',
  fieldsLabel: 'fields',
  modelLabel: 'Model',
  sourceLabel: 'Source',
};

export function attachMonacoInlineReferences(
  instance: editor.IStandaloneCodeEditor,
  monaco: Pick<typeof import('monaco-editor'), 'Range' | 'Uri'>,
  projection: MonacoInlineReferences,
  onInspectReference: (id: string) => void
): { dispose(): void } {
  const records: CardRecord[] = [];
  const subscriptions: { dispose(): void }[] = [];
  let disposed = false;
  let editorDisposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    subscriptions.forEach((subscription) => subscription.dispose());
    if (!editorDisposed && records.length > 0) {
      instance.changeViewZones((accessor) => {
        records.forEach((record) => {
          if (record.zoneId !== null) accessor.removeZone(record.zoneId);
        });
      });
    }
    records.forEach((record) => {
      record.button.removeEventListener('click', record.inspect);
      if (!editorDisposed) instance.removeOverlayWidget(record.widget);
      record.node.remove();
    });
  };
  const model = instance.getModel();
  if (
    model === null ||
    projection.items.length === 0 ||
    model.uri.toString() !== monaco.Uri.parse(projection.path).toString() ||
    model.getValue() !== projection.value ||
    new Set(projection.items.map((item) => item.id)).size !== projection.items.length
  )
    return { dispose };

  const ranges = projection.items.map((reference) => {
    if (
      !Number.isInteger(reference.startOffset) ||
      !Number.isInteger(reference.endOffset) ||
      reference.startOffset < 0 ||
      reference.endOffset <= reference.startOffset ||
      reference.endOffset > model.getValueLength()
    )
      return null;
    const start = model.getPositionAt(reference.startOffset);
    const end = model.getPositionAt(reference.endOffset);
    const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
    return model.getValueInRange(range) === reference.sourceText ? range : null;
  });
  if (ranges.some((range) => range === null)) return { dispose };

  const copy = { ...DEFAULT_COPY, ...projection.copy };
  const element = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    text?: string
  ): HTMLElementTagNameMap[Tag] => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const layout = (record: CardRecord) => {
    if (disposed) return;
    const info = instance.getLayoutInfo();
    record.left = info.contentLeft + 8;
    record.node.style.width = `${Math.max(0, Math.min(680, info.contentWidth - 24))}px`;
    record.node.hidden = record.top === null || record.top + 150 < 0 || record.top > info.height;
    instance.layoutOverlayWidget(record.widget);
  };
  try {
    for (const [index, reference] of projection.items.entries()) {
      const node = element('section', 'reference-card');
      node.setAttribute('role', 'group');
      node.setAttribute('aria-label', reference.label);
      node.dataset.referenceId = reference.id;
      const header = element('div', 'reference-card-header');
      header.append(
        element('h2', 'reference-card-name', reference.label),
        element(
          'span',
          'reference-card-type',
          reference.kind === 'model' ? copy.modelLabel : copy.sourceLabel
        )
      );
      const ports = element('div', 'reference-card-ports');
      ports.append(
        element(
          'div',
          'reference-card-port',
          `${copy.inputsLabel}: ${reference.inputs.join(', ')}`
        ),
        element('div', 'reference-card-port', `${copy.outputLabel}: ${reference.outputLabel}`)
      );
      const count =
        reference.columnCount === undefined
          ? ''
          : ` · ${reference.columnCount} ${copy.fieldsLabel}`;
      const button = element('button', 'reference-card-schema', `${copy.inspectLabel}${count}`);
      button.type = 'button';
      button.setAttribute('aria-label', `${copy.inspectAriaPrefix} ${reference.label}`);
      const inspect = () => onInspectReference(reference.id);
      button.addEventListener('click', inspect);
      node.append(header, ports, button);
      const record: CardRecord = {
        node,
        button,
        inspect,
        lineNumber: ranges[index]!.endLineNumber,
        top: null,
        left: 0,
        zoneId: null,
        widget: {
          getId: () => `dvt-inline-reference:${reference.id}`,
          getDomNode: () => node,
          getPosition: () => ({ preference: { top: (record.top ?? 0) + 6, left: record.left } }),
        },
      };
      records.push(record);
      node.hidden = true;
      instance.addOverlayWidget(record.widget);
    }
    instance.changeViewZones((accessor) => {
      records.forEach((record) => {
        record.zoneId = accessor.addZone({
          afterLineNumber: record.lineNumber,
          heightInPx: 150,
          domNode: element('div', 'reference-card-space'),
          onDomNodeTop: (top) => {
            record.top = top;
            layout(record);
          },
        });
      });
    });
    const layoutAll = () => records.forEach(layout);
    subscriptions.push(
      instance.onDidLayoutChange(layoutAll),
      instance.onDidScrollChange(layoutAll),
      instance.onDidChangeModelContent(dispose),
      instance.onDidChangeModel(dispose),
      instance.onDidDispose(() => {
        editorDisposed = true;
        dispose();
      })
    );
    layoutAll();
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
