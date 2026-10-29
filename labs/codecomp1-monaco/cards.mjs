/** Passive public Monaco widgets: no content, model, selection or history writes. */
export function attachCards(editor, monaco, verifiedReferences, onInspect) {
  const model = editor.getModel();
  if (!model) throw new Error('An existing Monaco model is required.');
  const records = [];
  const subscriptions = [];
  let disposed = false;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const layout = (record) => {
    if (disposed) return;
    const info = editor.getLayoutInfo();
    record.left = info.contentLeft + 8;
    record.node.style.width = `${Math.max(0, Math.min(680, info.contentWidth - 24))}px`;
    record.node.hidden = record.top === null || record.top + 150 < 0 || record.top > info.height;
    editor.layoutOverlayWidget(record.widget);
  };

  for (const reference of verifiedReferences) {
    if (
      !Number.isInteger(reference.startOffset) ||
      !Number.isInteger(reference.endOffset) ||
      reference.startOffset < 0 ||
      reference.endOffset <= reference.startOffset ||
      reference.endOffset > model.getValueLength()
    ) {
      throw new Error('A verified reference must have an exact non-empty model range.');
    }
    const end = model.getPositionAt(reference.endOffset);
    const start = model.getPositionAt(reference.startOffset);
    const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
    if (model.getValueInRange(range) !== reference.referenceSource) {
      throw new Error('The verified reference does not match the mounted model.');
    }
    const node = element('section', 'reference-card');
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', `${reference.name}: componente de laboratorio`);
    node.dataset.referenceId = reference.id;
    const header = element('div', 'reference-card-header');
    header.append(
      element('h2', 'reference-card-name', reference.name),
      element('span', 'reference-card-type', reference.type)
    );
    const ports = element('div', 'reference-card-ports');
    ports.append(
      element(
        'div',
        'reference-card-port',
        `Entradas: ${reference.inputs.map((input) => input.name).join(', ')}`
      ),
      element('div', 'reference-card-port', `Salida: ${reference.output.name}`)
    );
    const schema = element(
      'button',
      'reference-card-schema',
      `Ver definición y esquema · ${reference.output.columns.length} campos`
    );
    schema.type = 'button';
    schema.setAttribute('aria-label', `Ver definición y esquema de ${reference.name}`);
    const inspect = () => onInspect(reference);
    schema.addEventListener('click', inspect);
    node.append(header, ports, schema);
    const record = { node, top: null, left: 0, widget: null, zoneId: null, inspect, schema };
    record.widget = {
      getId: () => `codecomp1-card:${reference.id}`,
      getDomNode: () => node,
      getPosition: () => ({ preference: { top: (record.top ?? 0) + 6, left: record.left } }),
    };
    records.push(record);
    node.hidden = true;
    editor.addOverlayWidget(record.widget);
    editor.changeViewZones((accessor) => {
      record.zoneId = accessor.addZone({
        afterLineNumber: end.lineNumber,
        heightInPx: 150,
        domNode: element('div', 'reference-card-space'),
        onDomNodeTop: (top) => {
          record.top = top;
          layout(record);
        },
      });
    });
    layout(record);
  }

  const layoutAll = () => records.forEach(layout);
  subscriptions.push(editor.onDidLayoutChange(layoutAll), editor.onDidScrollChange(layoutAll));
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    subscriptions.forEach((subscription) => subscription.dispose());
    editor.changeViewZones((accessor) => {
      records.forEach((record) => accessor.removeZone(record.zoneId));
    });
    records.forEach((record) => {
      record.schema.removeEventListener('click', record.inspect);
      editor.removeOverlayWidget(record.widget);
      record.node.remove();
    });
  };
  subscriptions.push(editor.onDidChangeModel(dispose), editor.onDidDispose(dispose));
  return { dispose };
}
