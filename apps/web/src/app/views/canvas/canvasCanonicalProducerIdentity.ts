/** Compare producer contents independently of consumer-local protobuf anchor numbering. */
import { reflect, isReflectMessage } from '@bufbuild/protobuf/reflect';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { resolveFunctionReference } from '@dvt/postgres-projection';
import { jcsCanonicalize } from '@dvt/crypto';
import { mergeCanvasCompositionOperands } from './canvasCompositionOperands';
import { createSourceDocument } from './canvasSourceDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

function collectFunctionReferences(message: unknown, references: Set<number>): void {
  if (!isReflectMessage(message)) throw new Error('Expected a typed producer message.');
  for (const field of message.fields) {
    if (field.fieldKind === 'scalar' && field.name === 'function_reference') {
      references.add(Number(message.get(field)));
    } else if (message.isSet(field)) {
      if (field.fieldKind === 'message') collectFunctionReferences(message.get(field), references);
      else if (field.fieldKind === 'list' && field.listKind === 'message')
        for (const child of message.get(field)) collectFunctionReferences(child, references);
      else if (field.fieldKind === 'map' && field.mapKind === 'message')
        for (const child of message.get(field).values())
          collectFunctionReferences(child, references);
    }
  }
}

export function canvasCanonicalProducerIdentity(document: SubstraitDocument): string | null {
  try {
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) return null;
    const references = new Set<number>();
    collectFunctionReferences(reflect(PlanSchema, document.plan), references);
    const extensions = document.plan.extensions
      .flatMap((extension) => {
        if (extension.mappingType.case !== 'extensionFunction')
          throw new Error('Unsupported producer extension.');
        const anchor = extension.mappingType.value.functionAnchor;
        if (!references.has(anchor)) return [];
        const identity = resolveFunctionReference(document.plan, anchor);
        if (!identity.ok) throw new Error('Unresolved producer function identity.');
        return [
          {
            extension,
            identity: jcsCanonicalize({ urn: identity.value.urn, name: identity.value.name }),
          },
        ];
      })
      .sort((left, right) =>
        left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0
      );
    const normalized = mergeCanvasCompositionOperands([
      {
        plan: { ...document.plan, extensions: extensions.map(({ extension }) => extension) },
        sidecar: {
          ...document.sidecar,
          relations: indexed.index.postorder.map((id) => indexed.index.relations.get(id)!.binding),
        },
      },
    ]);
    const operand = normalized.operands[0]!;
    const plan = {
      ...document.plan,
      extensions: normalized.plan.extensions,
      extensionUrns: normalized.plan.extensionUrns,
    };
    return jcsCanonicalize(
      encodeDvtSubstraitSemanticDocument(createSourceDocument(operand.entries, operand.root, plan))
    );
  } catch {
    return null;
  }
}
