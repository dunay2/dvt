/**
 * Owned concern: configure Input provenance and repair explicitly selected missing producer identities.
 * @baseline ADR-0064 / GH-3628: consumer operations and published Output retain their identities.
 * @decision Compose a type-checked semantic binding and dependency-edge update atomically.
 * @consequence Normal consumed rewiring rejects; partial repair never grants execution readiness.
 * @version 1.1.0
 */
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type {
  CanvasColumnMappingResult,
  CanvasColumnMappingSource,
  CanvasColumnMappingRejection,
} from './canvasColumnMappingModel';
import {
  canvasInputSlotId,
  projectCanvasInputBindings,
  type CanvasInputBinding,
} from './canvasInputBindings';
import { readCanvasPublishedInputFields } from './canvasPublishedInputFields';
import { canvasInputBindingIsConsumed } from './canvasInputBindingUsage';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import { resolveCanvasEdgeCreationTransaction } from './canvasEdgeAdmissionTransaction';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { repairCanvasProducerInput } from './canvasProducerInputRepair';

type InputCommand = Readonly<{
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  target: Readonly<{ nodeId: string; inputId?: string }>;
  editable?: boolean;
  signal?: AbortSignal;
}>;
const rejected = (reason: CanvasColumnMappingRejection): CanvasColumnMappingResult => ({
  outcome: 'rejected',
  reason,
});

async function readInputs(args: InputCommand) {
  const nodes = new Map(args.canonicalNodesById);
  for (const node of Object.values(args.draftSession.localNodeCatalog ?? {}))
    nodes.set(node.id, node);
  const consumer = nodes.get(args.target.nodeId);
  if (
    consumer?.pluginId !== 'dvt' ||
    consumer.kind !== 'dvt:transform' ||
    isDbtCompatibleModel(consumer)
  )
    return null;
  const authority = readDvtTransformAuthoringAuthority(consumer);
  const edges = args.draftSession.workingSet.visibleEdges;
  const sourceIds = new Set(
    edges.filter((edge) => edge.targetId === consumer.id).map((edge) => edge.sourceId)
  );
  const producers = new Map(
    await Promise.all(
      [...sourceIds].map(async (id) => {
        const node = nodes.get(id);
        return [
          id,
          node == null
            ? []
            : await readCanvasPublishedInputFields(
                { node, nodes: [...nodes.values()], edges },
                args.signal
              ),
        ] as const;
      })
    )
  );
  return {
    nodes,
    consumer,
    producers,
    inputs: projectCanvasInputBindings({
      targetNodeId: consumer.id,
      edges,
      producers,
      retainedSidecar: authority?.semanticDocument.sidecar,
    }),
  };
}

function repairConsumedInput(
  context: NonNullable<Awaited<ReturnType<typeof readInputs>>>,
  previous: CanvasInputBinding,
  replacementFieldId: string
): CanonicalNode {
  const authority = readDvtTransformAuthoringAuthority(context.consumer)!;
  const producer = context.nodes.get(previous.source.nodeId)!;
  const producerDocument = resolveCanvasProducerDocument(producer, [...context.nodes.values()]);
  if (producerDocument == null) throw new Error('Producer publication is unavailable.');
  const repaired = repairCanvasProducerInput(
    decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
    {
      producerNodeId: previous.source.nodeId,
      previousFieldId: previous.source.columnId,
      replacementFieldId,
      producerDocument,
    }
  );
  return applyDvtSubstraitSemanticDocument(
    context.consumer,
    encodeDvtSubstraitSemanticDocument(repaired)
  );
}

function persistInputs(
  args: InputCommand,
  inputs: readonly CanvasInputBinding[],
  producers: ReadonlySet<string>
): CanvasColumnMappingResult {
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.replaceEdges(
      args.draftSession,
      args.draftSession.workingSet.visibleEdges.map((edge) =>
        edge.targetId !== args.target.nodeId || !producers.has(edge.sourceId)
          ? edge
          : {
              ...edge,
              inputBindings: {
                version: 'v1',
                fields: inputs
                  .filter((input) => input.source.nodeId === edge.sourceId)
                  .map((input) => ({
                    inputId: input.inputId,
                    producerFieldId: input.source.columnId,
                  })),
              },
            }
      )
    ),
  };
}

export async function bindCanvasInputField(
  command: InputCommand &
    Readonly<{ source: CanvasColumnMappingSource; pluginPortMap?: PluginPortMap }>
): Promise<CanvasColumnMappingResult> {
  let args = command;
  args.signal?.throwIfAborted();
  if (args.editable === false) return rejected('read_only');
  try {
    if (
      !args.draftSession.workingSet.visibleEdges.some(
        (edge) => edge.sourceId === args.source.nodeId && edge.targetId === args.target.nodeId
      )
    ) {
      if (args.pluginPortMap == null) return rejected('source_not_connected');
      const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
      const transaction = await resolveCanvasEdgeCreationTransaction({
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        draftSession: args.draftSession,
        pluginPortMap: args.pluginPortMap,
        connection: {
          source: args.source.nodeId,
          target: args.target.nodeId,
          sourceHandle: null,
          targetHandle: null,
        },
        edges: args.draftSession.workingSet.visibleEdges.map((edge) => ({
          id: `${edge.sourceId}->${edge.targetId}`,
          source: edge.sourceId,
          target: edge.targetId,
        })),
      });
      if (transaction.outcome === 'noop') return rejected('invalid_input_bindings');
      args = {
        ...args,
        draftSession: canvasDraftSession.workingSet.replaceEdges(
          transaction.draftSession,
          transaction.draftSession.workingSet.visibleEdges.map((edge) =>
            edge.sourceId === args.source.nodeId && edge.targetId === args.target.nodeId
              ? { ...edge, inputBindings: { version: 'v1', fields: [] } }
              : edge
          )
        ),
      };
    }
    const context = await readInputs(args);
    if (context == null) return rejected('target_not_canonical_transform');
    const field = context.producers
      .get(args.source.nodeId)
      ?.find((candidate) => candidate.columnId === args.source.columnId);
    if (field == null) return rejected('source_column_not_found');
    const inputId = args.target.inputId ?? canvasInputSlotId(args.source.nodeId, field.columnId);
    const previous = context.inputs.find((input) => input.inputId === inputId);
    if (args.target.inputId != null && previous == null) return rejected('mapping_not_found');
    if (
      previous?.source.nodeId === args.source.nodeId &&
      previous.source.columnId === field.columnId
    )
      return { outcome: 'applied', draftSession: args.draftSession };
    const consumed =
      previous != null &&
      canvasInputBindingIsConsumed(
        previous,
        context.consumer,
        context.nodes.get(previous.source.nodeId)
      );
    if (consumed) {
      if (previous.state !== 'unresolved' || previous.source.nodeId !== args.source.nodeId)
        return rejected('input_in_use');
    }
    const repairedConsumer = consumed
      ? repairConsumedInput(context, previous, field.columnId)
      : undefined;
    const duplicates = context.inputs.filter(
      (input) =>
        input.inputId !== inputId &&
        input.source.nodeId === args.source.nodeId &&
        input.source.columnId === field.columnId
    );
    if (
      duplicates.length > 0 &&
      (repairedConsumer == null ||
        duplicates.some((input) =>
          canvasInputBindingIsConsumed(
            input,
            context.consumer,
            context.nodes.get(input.source.nodeId)
          )
        ))
    )
      return rejected('mapping_not_found');
    const next: CanvasInputBinding = {
      inputId,
      source: args.source,
      name: field.name,
      type: field.type,
      state: 'available',
    };
    args.signal?.throwIfAborted();
    const existing = context.inputs.filter((input) => !duplicates.includes(input));
    const result = persistInputs(
      args,
      previous == null
        ? [...existing, next]
        : existing.map((input) => (input.inputId === inputId ? next : input)),
      new Set([args.source.nodeId, ...(previous == null ? [] : [previous.source.nodeId])])
    );
    return repairedConsumer != null && result.outcome === 'applied'
      ? {
          ...result,
          draftSession: canvasDraftSession.workingSet.updateNodeDefinition(
            result.draftSession,
            repairedConsumer
          ),
        }
      : result;
  } catch (error) {
    args.signal?.throwIfAborted();
    return rejected('invalid_input_bindings');
  }
}

export async function removeCanvasInputField(
  args: InputCommand & Readonly<{ source?: CanvasColumnMappingSource }>
): Promise<CanvasColumnMappingResult> {
  if (args.editable === false) return rejected('read_only');
  try {
    const context = await readInputs(args);
    if (context == null) return rejected('target_not_canonical_transform');
    const input = context.inputs.find((entry) => entry.inputId === args.target.inputId);
    if (
      input == null ||
      (args.source != null &&
        (input.source.nodeId !== args.source.nodeId ||
          input.source.columnId !== args.source.columnId))
    )
      return rejected('mapping_not_found');
    if (
      canvasInputBindingIsConsumed(input, context.consumer, context.nodes.get(input.source.nodeId))
    )
      return rejected('input_in_use');
    args.signal?.throwIfAborted();
    return persistInputs(
      args,
      context.inputs.filter((entry) => entry.inputId !== input.inputId),
      new Set([input.source.nodeId])
    );
  } catch (error) {
    args.signal?.throwIfAborted();
    return rejected('invalid_input_bindings');
  }
}
