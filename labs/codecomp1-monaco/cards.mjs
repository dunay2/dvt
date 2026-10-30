/** Adapt the labelled laboratory fixture to the production passive Monaco renderer. */
import { attachMonacoInlineReferences } from '../../apps/web/src/app/components/monaco/monacoInlineReferences.ts';

export function attachCards(editor, monaco, verifiedReferences, onInspect) {
  const model = editor.getModel();
  if (!model) throw new Error('An existing Monaco model is required.');
  const byId = new Map(verifiedReferences.map((reference) => [reference.id, reference]));
  return attachMonacoInlineReferences(
    editor,
    monaco,
    {
      path: model.uri.toString(),
      value: model.getValue(),
      items: verifiedReferences.map((reference) => ({
        id: reference.id,
        startOffset: reference.startOffset,
        endOffset: reference.endOffset,
        sourceText: reference.referenceSource,
        label: reference.name,
        kind: 'model',
        inputs: reference.inputs.map((input) => input.name),
        outputLabel: reference.output.name,
        columnCount: reference.output.columns.length,
      })),
      copy: {
        inputsLabel: 'Entradas',
        outputLabel: 'Salida',
        inspectLabel: 'Ver definición y esquema',
        inspectAriaPrefix: 'Ver definición y esquema de',
        fieldsLabel: 'campos',
        modelLabel: 'Modelo de laboratorio',
        sourceLabel: 'Fuente de laboratorio',
      },
    },
    (id) => {
      const reference = byId.get(id);
      if (reference) onInspect(reference);
    }
  );
}
