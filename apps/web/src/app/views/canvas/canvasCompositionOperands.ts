/** Merge owned operand trees without changing stable identities or expression meaning. */
import { clone } from '@bufbuild/protobuf';
import { reflect, isReflectMessage } from '@bufbuild/protobuf/reflect';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  deriveSubstraitSchemas,
  indexSubstraitRelations,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { resolveFunctionReference } from '@dvt/postgres-projection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { createSourcePlan } from './canvasSourceDocument';

function mergeCompositionFunctions(target: Plan, source: Plan): ReadonlyMap<number, number> {
  const anchors = new Map<number, number>();
  for (const extension of source.extensions) {
    if (extension.mappingType.case !== 'extensionFunction')
      throw new Error('Unsupported composition extension.');
    const anchor = extension.mappingType.value.functionAnchor;
    const identity = resolveFunctionReference(source, anchor);
    if (!identity.ok) throw new Error('Ambiguous or dangling composition function.');
    anchors.set(
      anchor,
      dvtSubstraitExpression.ensureScalarFunction(target, identity.value).functionAnchor
    );
  }
  return anchors;
}

function remapCompositionAnchors(
  message: unknown,
  relations: ReadonlyMap<number, number>,
  functions: ReadonlyMap<number, number>
): void {
  if (!isReflectMessage(message)) throw new Error('Expected a typed composition message.');
  for (const field of message.fields) {
    if (field.fieldKind === 'scalar') {
      const anchors =
        field.name === 'function_reference'
          ? functions
          : message.desc.typeName === 'substrait.RelCommon' && field.name === 'rel_anchor'
            ? relations
            : null;
      if (anchors == null) continue;
      const mapped = anchors.get(Number(message.get(field)));
      if (mapped == null) throw new Error('Unbound composition anchor.');
      message.set(field, mapped);
    } else if (message.isSet(field)) {
      if (field.fieldKind === 'message')
        remapCompositionAnchors(message.get(field), relations, functions);
      else if (field.fieldKind === 'list' && field.listKind === 'message')
        for (const child of message.get(field))
          remapCompositionAnchors(child, relations, functions);
      else if (field.fieldKind === 'map' && field.mapKind === 'message')
        for (const child of message.get(field).values())
          remapCompositionAnchors(child, relations, functions);
    }
  }
}

export function mergeCanvasCompositionOperands(documents: readonly SubstraitDocument[]) {
  const plan = createSourcePlan();
  const identities = new Set<string>();
  let nextAnchor = 1;
  const operands = documents.map((document) => {
    const schemas = deriveSubstraitSchemas(document).schemas;
    const anchors = new Map<number, number>();
    for (const binding of document.sidecar.relations) {
      if (identities.has(binding.relationId))
        throw new Error('A producer occurrence cannot be consumed twice.');
      identities.add(binding.relationId);
      anchors.set(binding.relAnchor, nextAnchor++);
    }
    const cloned = clone(PlanSchema, document.plan);
    remapCompositionAnchors(
      reflect(PlanSchema, cloned),
      anchors,
      mergeCompositionFunctions(plan, document.plan)
    );
    const indexed = indexSubstraitRelations({
      plan: cloned,
      sidecar: {
        ...document.sidecar,
        relations: document.sidecar.relations.map((binding) => ({
          ...binding,
          relAnchor: anchors.get(binding.relAnchor)!,
        })),
      },
    });
    if (!indexed.ok) throw indexed.error;
    const root = indexed.index.relations.get(indexed.index.rootId)!;
    return {
      root,
      schema: schemas.get(root.binding.relationId)!,
      entries: indexed.index.postorder.map((id) => indexed.index.relations.get(id)!),
    };
  });
  return { plan, operands, nextAnchor };
}
