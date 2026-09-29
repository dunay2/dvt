/** Translate Input provenance into explicit operator selections, never a physical schema rewrite. */
import type { DvtInputBindingsV1 } from '@dvt/contracts';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import {
  canvasInputSlotId,
  readCanvasInputBindings,
  type CanvasInputBindingEdge,
} from './canvasInputBindings';

export function resolveCanvasPhysicalInputBindings(
  node: CanonicalNode,
  edge: CanvasInputBindingEdge
): DvtInputBindingsV1 | undefined {
  const bindings = readCanvasInputBindings(edge);
  const publication = readDvtSourceOutputProjection(node);
  if (publication == null)
    throw new SubstraitAnalysisError('invalid_binding', 'Producer publication is unavailable.');
  const published = publication.outputs.map((field) => field.sourceFieldName!);
  if (bindings != null) {
    if (
      bindings.fields.some(
        (field) =>
          !publication.source.fields.some((physical) => physical.name === field.producerFieldId)
      )
    )
      throw new SubstraitAnalysisError('invalid_binding', 'Input binding is unresolved.');
    // Resolve the admitted input without rewriting saved slots or authored expressions.
    return {
      ...bindings,
      fields: bindings.fields.filter((field) => published.includes(field.producerFieldId)),
    };
  }
  if (
    published.length === publication.source.fields.length &&
    published.every((name, index) => name === publication.source.fields[index]?.name)
  )
    return undefined;
  return {
    version: 'v1',
    fields: published.map((producerFieldId) => ({
      inputId: canvasInputSlotId(node.id, producerFieldId),
      producerFieldId,
    })),
  };
}

type Input = Readonly<{
  fields: readonly (string | Readonly<{ name: string; id?: string }>)[];
  fieldIds?: readonly string[];
  inputBindings?: DvtInputBindingsV1;
}>;
export function selectedCanvasInputOrdinals(input: Input): readonly number[] {
  const names =
    input.fieldIds ??
    input.fields.map((field) => (typeof field === 'string' ? field : (field.id ?? field.name)));
  if (input.inputBindings == null) return names.map((_, ordinal) => ordinal);
  return input.inputBindings.fields.map((field) => {
    const ordinal = names.indexOf(field.producerFieldId);
    if (ordinal < 0)
      throw new SubstraitAnalysisError('invalid_binding', 'Input binding is unresolved.');
    return ordinal;
  });
}
export function canvasInputRequiresProjection(input: Input): boolean {
  try {
    const ordinals = selectedCanvasInputOrdinals(input);
    return (
      ordinals.length !== input.fields.length ||
      ordinals.some((ordinal, index) => ordinal !== index)
    );
  } catch {
    return true;
  }
}
export function requireCompleteCanvasInput(input: Input): void {
  if (canvasInputRequiresProjection(input))
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Mapped partial inputs require an explicit Transform before composition.'
    );
}
