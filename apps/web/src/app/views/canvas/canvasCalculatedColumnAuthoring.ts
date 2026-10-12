/** ConfigureCanvasDvtNode delegates calculation to the selected-relation command used by Transform. */
import {
  DvtSemanticFieldNameV1Schema,
  DvtStringLiteralV1Schema,
  DvtTimestampLiteralV1Schema,
} from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type { DvtSubstraitProjectionAuthoringRejection } from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';

export type CanvasCalculatedColumnRequest =
  | Readonly<{ nodeId: string; kind: 'field-ref'; alias: string; inputFieldId: string }>
  | Readonly<{ nodeId: string; kind: 'string-literal'; alias: string; value: string }>
  | Readonly<{ nodeId: string; kind: 'timestamp-literal'; alias: string; value: string }>
  | Readonly<{
      nodeId: string;
      kind: 'scalar-function';
      alias: string;
      inputFieldId: string;
      operandFieldIds?: never;
      capabilityId: string;
    }>
  | Readonly<{
      nodeId: string;
      kind: 'scalar-function';
      alias: string;
      operandFieldIds: readonly [string, ...string[]];
      inputFieldId?: never;
      capabilityId: string;
    }>
  | Readonly<{
      nodeId: string;
      kind: 'row-number';
      alias: string;
      orderFieldId: string;
    }>;

export type CanvasCalculatedColumnResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession; createdFieldId: string }>
  | Readonly<{ outcome: 'rejected'; reason: DvtSubstraitProjectionAuthoringRejection }>;

export async function applyCanvasCalculatedColumn(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  request: CanvasCalculatedColumnRequest;
}): Promise<CanvasCalculatedColumnResult> {
  const request = args.request;
  if (
    !DvtSemanticFieldNameV1Schema.safeParse(request.alias).success ||
    request.alias.trim().length === 0
  )
    return { outcome: 'rejected', reason: 'invalid_alias' };
  const catalog = new Map(args.canonicalNodesById);
  for (const node of Object.values(args.draftSession.localNodeCatalog ?? {}))
    catalog.set(node.id, node);
  const target = catalog.get(request.nodeId);
  if (
    target?.kind !== 'dvt:transform' ||
    target.pluginId !== 'dvt' ||
    target.metadata?.transformAuthoring == null
  )
    return { outcome: 'rejected', reason: 'invalid_target' };
  if (
    (request.kind === 'string-literal' &&
      !DvtStringLiteralV1Schema.safeParse(request.value).success) ||
    (request.kind === 'timestamp-literal' &&
      !DvtTimestampLiteralV1Schema.safeParse(request.value).success)
  )
    return { outcome: 'rejected', reason: 'invalid_literal' };
  let session: CanvasRelationAnalysisSession | undefined;
  try {
    const nodes = [...catalog.values()];
    const document = resolveCanvasProducerDocument(target, nodes);
    let connection;
    try {
      connection = resolveCanvasSubstraitGraphBindings({
        node: target,
        nodes,
        edges: args.draftSession.workingSet.visibleEdges,
      }).connection;
    } catch {
      // Authoring an incomplete draft does not require execution admission.
    }
    session = new CanvasRelationAnalysisSession(target.id, connection);
    session.receive(
      document ?? null,
      resolveUnmappedCanvasReadFields({
        document: document ?? null,
        nodeId: target.id,
        nodes,
        edges: args.draftSession.workingSet.visibleEdges,
      })
    );
    const root = session.locate(session.rootId, session.revision);
    const before = await session.query(session.rootId);
    const inputs =
      root.relation.relType.case === 'project' ? await session.query(root.inputs[0]!) : before;
    const fields = [...inputs.bindings, ...before.bindings];
    if (fields.some((field) => field.parentFieldId == null && field.displayName === request.alias))
      return { outcome: 'rejected', reason: 'duplicate_alias' };
    const ids =
      request.kind === 'field-ref'
        ? [request.inputFieldId]
        : request.kind === 'row-number'
          ? [request.orderFieldId]
          : request.kind === 'scalar-function'
            ? (request.operandFieldIds ?? [request.inputFieldId])
            : [];
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => !fields.some((field) => field.fieldId === id))
    )
      return { outcome: 'rejected', reason: 'invalid_reference' };
    const updated = await applySelectedRelationDerivedOutput(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: root.relation.relType.case === 'project' ? 'edit' : 'insert',
      alias: request.alias,
      ...(request.kind === 'scalar-function'
        ? {
            capabilityIds: [request.capabilityId] as const,
            operandFieldIds: request.operandFieldIds ?? ([request.inputFieldId] as const),
          }
        : { expression: request }),
    });
    const created = updated.sidecar.fields.find(
      (field) => field.relationId === session!.rootId && field.displayName === request.alias
    )!;
    return {
      outcome: 'applied',
      createdFieldId: created.fieldId,
      draftSession: canvasDraftSession.workingSet.upsertNode(
        args.draftSession,
        applyDvtSubstraitSemanticDocument(target, encodeDvtSubstraitSemanticDocument(updated))
      ),
    };
  } catch (error) {
    return {
      outcome: 'rejected',
      reason:
        error instanceof Error && error.message.includes('capability')
          ? 'unsupported_capability'
          : 'invalid_document',
    };
  } finally {
    session?.dispose();
  }
}
