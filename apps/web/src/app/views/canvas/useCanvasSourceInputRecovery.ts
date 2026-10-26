/** Own unpublished Input recovery inside the existing discardable Model graph lifetime. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { jcsCanonicalize } from '@dvt/crypto';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { readCanvasDvtCompositionInputCatalog } from './canvasDvtCompositionInputCatalog';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { prepareCanvasSourceOccurrenceInputRecovery } from './canvasSourceOccurrenceInputRecovery';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';
import { readCanvasInputBindings } from './canvasInputBindings';
import { physicalReadMatches } from './canvasSubstraitInputBinding';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';

type RecoveryArgs = Readonly<{
  state: ReturnType<typeof useCanvasRelationalTreeDraftState>;
  editable: boolean;
  nodeId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  document: SubstraitDocument | null;
}>;

function recoveryAuthorityIdentity(args: RecoveryArgs): string {
  const publications = args.inputs.map((input) => {
    const producer = args.nodes.find((node) => node.id === input.nodeId);
    try {
      return [
        input.nodeId,
        producer == null
          ? null
          : (readDvtSourceOutputProjection(producer)?.outputs ?? input.producer?.document),
      ];
    } catch {
      return [input.nodeId, null];
    }
  });
  return jcsCanonicalize([
    args.nodeId,
    args.inputs,
    publications,
    args.edges
      .filter((edge) => edge.targetId === args.nodeId)
      .map((edge) => [edge.sourceId, readCanvasInputBindings(edge) ?? null]),
  ]);
}

function recoveryCandidates(
  args: RecoveryArgs,
  edges: readonly CanonicalEdge[],
  inputs: readonly CanvasDvtCompositionInput[]
) {
  const fieldsByRelationId = new Map<string, ReadonlySet<string>>();
  const producerByRelationId = new Map<string, string>();
  const indexed = args.document == null ? null : indexSubstraitRelations(args.document);
  if (!indexed?.ok) return { fieldsByRelationId, producerByRelationId };
  const { denied } = resolveCanvasReadFieldEligibility({
    document: args.document,
    nodeId: args.nodeId,
    nodes: args.nodes,
    edges,
  });
  for (const read of indexed.index.relations.values()) {
    if (read.binding.producerRef != null) continue;
    const matches = inputs.filter((input) => physicalReadMatches(read, input));
    const input = matches.length === 1 ? matches[0] : undefined;
    const producer = args.nodes.find((node) => node.id === input?.nodeId);
    if (producer == null) continue;
    try {
      const published = new Set(
        readDvtSourceOutputProjection(producer)?.outputs.map((field) => field.sourceFieldName)
      );
      const fields = new Set(
        read.fields
          .filter(
            (field) =>
              field.parentFieldId == null &&
              denied.has(field.fieldId) &&
              published.has(field.displayName)
          )
          .map((field) => field.fieldId)
      );
      if (fields.size > 0) {
        fieldsByRelationId.set(read.binding.relationId, fields);
        producerByRelationId.set(read.binding.relationId, producer.id);
      }
    } catch {
      /* Unavailable publication grants no recovery capability. */
    }
  }
  return { fieldsByRelationId, producerByRelationId };
}

export function useCanvasSourceInputRecovery(args: RecoveryArgs) {
  const authorityIdentity = useMemo(
    () => recoveryAuthorityIdentity(args),
    [args.nodeId, args.nodes, args.edges, args.inputs]
  );
  const graph = args.state.graphSnapshot;
  const staged =
    args.state.active && graph.inputRecovery?.authorityIdentity === authorityIdentity
      ? graph.inputRecovery
      : null;
  const edges = staged?.edges ?? args.edges;
  const additions = args.state.active ? (graph.inputRecovery?.additions ?? []) : [];
  const inputs = useMemo(
    () =>
      staged == null
        ? args.inputs
        : readCanvasDvtCompositionInputCatalog({
            targetNodeId: args.nodeId,
            nodes: args.nodes,
            edges,
          }).inputs,
    [staged, args.inputs, args.nodeId, args.nodes, edges]
  );
  const candidates = useMemo(
    () => recoveryCandidates(args, edges, inputs),
    [args.document, args.nodeId, args.nodes, inputs, edges]
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef<{ controller: AbortController; kind: 'restore' | 'apply' } | null>(null);
  const publication = useRef<{
    expected: typeof graph;
    candidate: NonNullable<typeof graph.inputRecovery>;
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const committed = useRef<{
    graph: typeof graph;
    authorityIdentity: string;
    editable: boolean;
    active: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    committed.current = {
      graph,
      authorityIdentity,
      editable: args.editable,
      active: args.state.active,
    };
    const receipt = publication.current;
    if (receipt == null) return;
    const accepted =
      graph.inputRecovery === receipt.candidate &&
      args.editable &&
      args.state.active &&
      authorityIdentity === receipt.candidate.authorityIdentity;
    if (
      accepted ||
      graph !== receipt.expected ||
      !args.editable ||
      !args.state.active ||
      authorityIdentity !== receipt.candidate.authorityIdentity
    ) {
      publication.current = null;
      receipt.resolve(accepted);
    }
  });
  useEffect(() => {
    setBusy(pending.current != null);
    setFailed(false);
    return () => {
      if (pending.current?.kind === 'restore') {
        pending.current.controller.abort();
        pending.current = null;
      }
      publication.current?.resolve(false);
      publication.current = null;
    };
  }, [authorityIdentity]);
  useEffect(() => {
    setBusy(pending.current != null);
    return () => {
      pending.current?.controller.abort();
      pending.current = null;
      publication.current?.resolve(false);
      publication.current = null;
    };
  }, [args.editable, args.state.active]);
  useEffect(
    () => () => {
      committed.current = null;
      pending.current?.controller.abort();
      pending.current = null;
      publication.current?.resolve(false);
      publication.current = null;
    },
    []
  );
  const restore = async (relationId: string, fieldId: string): Promise<boolean> => {
    const document = args.document;
    const sourceNodeId = candidates.producerByRelationId.get(relationId);
    if (
      !args.state.active ||
      !args.editable ||
      pending.current != null ||
      document == null ||
      sourceNodeId == null ||
      !candidates.fieldsByRelationId.get(relationId)?.has(fieldId)
    )
      return false;
    const controller = new AbortController();
    pending.current = { controller, kind: 'restore' };
    setBusy(true);
    setFailed(false);
    try {
      const candidate = await prepareCanvasSourceOccurrenceInputRecovery({
        nodeId: args.nodeId,
        nodes: args.nodes,
        edges: args.edges,
        document,
        relationId,
        fieldId,
        sourceNodeId,
        additions,
        signal: controller.signal,
      });
      const current = committed.current;
      if (
        controller.signal.aborted ||
        current?.graph !== graph ||
        current.authorityIdentity !== authorityIdentity ||
        !current.editable ||
        !current.active
      )
        return false;
      return await new Promise<boolean>((resolve) => {
        const prepared = { ...candidate, authorityIdentity };
        publication.current = { expected: graph, candidate: prepared, resolve };
        args.state.commitInputRecovery(graph, prepared);
      });
    } catch {
      if (!controller.signal.aborted) setFailed(true);
      return false;
    } finally {
      if (pending.current?.controller === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  const cancel = () => {
    pending.current?.controller.abort();
    pending.current = null;
    publication.current?.resolve(false);
    publication.current = null;
    setBusy(false);
  };
  const runApply = async <T>(command: (signal: AbortSignal) => T | Promise<T>): Promise<T> => {
    if (pending.current != null) throw new Error('Model recovery command is already pending.');
    const controller = new AbortController();
    pending.current = { controller, kind: 'apply' };
    setBusy(true);
    try {
      return await command(controller.signal);
    } finally {
      if (pending.current?.controller === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  return {
    ...candidates,
    authorityIdentity,
    edges,
    inputs,
    additions,
    busy,
    failed,
    restore,
    cancel,
    runApply,
    isPending: () => pending.current != null,
  };
}
