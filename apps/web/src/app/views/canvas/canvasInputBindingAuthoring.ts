/** Configure Input provenance only; semantic operations and published Output never mutate here. */
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type {
  CanvasColumnMappingResult,
  CanvasColumnMappingSource,
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

type InputCommand = Readonly<{
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  target: Readonly<{ nodeId: string; inputId?: string }>;
  editable?: boolean;
  signal?: AbortSignal;
}>;
const rejected = (
  reason: Extract<CanvasColumnMappingResult, { outcome: 'rejected' }>['reason']
): CanvasColumnMappingResult => ({ outcome: 'rejected', reason });

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
  readDvtTransformAuthoringAuthority(consumer);
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
    inputs: projectCanvasInputBindings({ targetNodeId: consumer.id, edges, producers }),
  };
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
  args: InputCommand & Readonly<{ source: CanvasColumnMappingSource }>
): Promise<CanvasColumnMappingResult> {
  if (args.editable === false) return rejected('read_only');
  if (
    !args.draftSession.workingSet.visibleEdges.some(
      (edge) => edge.sourceId === args.source.nodeId && edge.targetId === args.target.nodeId
    )
  )
    return rejected('source_not_connected');
  try {
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
    if (
      previous != null &&
      canvasInputBindingIsConsumed(
        previous,
        context.consumer,
        context.nodes.get(previous.source.nodeId)
      )
    )
      return rejected('input_in_use');
    if (
      context.inputs.some(
        (input) =>
          input.inputId !== inputId &&
          input.source.nodeId === args.source.nodeId &&
          input.source.columnId === field.columnId
      )
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
    return persistInputs(
      args,
      previous == null
        ? [...context.inputs, next]
        : context.inputs.map((input) => (input.inputId === inputId ? next : input)),
      new Set([args.source.nodeId, ...(previous == null ? [] : [previous.source.nodeId])])
    );
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
