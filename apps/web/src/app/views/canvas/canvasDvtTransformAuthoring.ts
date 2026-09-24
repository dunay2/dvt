/** Own canonical Transform persistence; presentation hints never determine admissible tree shapes. */
import { DVT_TRANSFORM_AUTHORING_MODE, DvtTransformResultTargetV1Schema } from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import type {
  DvtNodeAuthoringMetadataErrors,
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import {
  normalizeDvtIdentifier,
  readDvtNodeConfig,
  readDvtString,
  withDvtConfig,
} from './canvasDvtSourceAuthoring';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';
import { canvasPresentationOperationForRel } from './canvasRelationalOperationPresentation';

type TransformMetadata =
  DvtUninitializedTransformAuthoringMetadata | DvtSubstraitTransformAuthoringMetadata;

const DEFAULT_MATERIALIZATION = 'view';
const VALID_MATERIALIZATIONS = new Set(['table', 'view']);

function normalizeMaterialized(value: string | undefined): string {
  const normalized = normalizeDvtIdentifier(value, DEFAULT_MATERIALIZATION);
  return VALID_MATERIALIZATIONS.has(normalized) ? normalized : DEFAULT_MATERIALIZATION;
}

function readMaterialized(node: CanonicalNode): string {
  return normalizeMaterialized(readDvtString(readDvtNodeConfig(node).materialized));
}

export function resolveDvtTransformAuthoringMetadata(
  node: CanonicalNode
):
  | Readonly<{ outcome: 'resolved'; metadata: TransformMetadata }>
  | Readonly<{ outcome: 'rejected'; reason: 'invalid_document' | 'unsupported_shape' }> {
  const config = readDvtNodeConfig(node);
  const disposition = {
    materialized: readMaterialized(node),
    ...(Object.hasOwn(config, 'resultTarget')
      ? { resultTarget: DvtTransformResultTargetV1Schema.parse(config.resultTarget) }
      : {}),
  };
  let authority: ReturnType<typeof readDvtTransformAuthoringAuthority>;
  try {
    authority = readDvtTransformAuthoringAuthority(node);
  } catch {
    return { outcome: 'rejected', reason: 'invalid_document' };
  }
  if (authority == null) {
    return {
      outcome: 'resolved',
      metadata: { kind: 'transform', mode: 'uninitialized', ...disposition },
    };
  }
  let projection: ReturnType<typeof decodeDvtSubstraitProjectionDocument>;
  try {
    projection = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  } catch {
    return { outcome: 'rejected', reason: 'invalid_document' };
  }
  const indexed = indexSubstraitRelations(projection);
  if (!indexed.ok) return { outcome: 'rejected', reason: 'unsupported_shape' };
  let entry = indexed.index.relations.get(indexed.index.rootId)!;
  let shape: DvtSubstraitTransformAuthoringMetadata['shape'] = 'projection';
  while (entry.inputs.length === 1) {
    if (entry.relation.relType.case === 'aggregate') shape = 'pilot';
    entry = indexed.index.relations.get(entry.inputs[0]!)!;
  }
  const operation = canvasPresentationOperationForRel(entry.relation);
  if (
    isCanvasJoinOperation(operation) ||
    isCanvasSetOperation(operation) ||
    operation === 'cross_join'
  )
    shape = operation;
  if (entry.relation.relType.case === 'read' && entry.binding.sourceRef == null) shape = 'pilot';
  return {
    outcome: 'resolved',
    metadata: fromDraft(authority.mode, disposition, shape, projection),
  };
}

export function createDvtTransformAuthoringMetadata(node: CanonicalNode): TransformMetadata {
  const resolution = resolveDvtTransformAuthoringMetadata(node);
  if (resolution.outcome === 'resolved') return resolution.metadata;
  throw new Error(
    resolution.reason === 'invalid_document'
      ? 'Invalid canonical Substrait document.'
      : 'Unsupported canonical Substrait relation shape.'
  );
}

function fromDraft(
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait,
  disposition: Pick<TransformMetadata, 'materialized' | 'resultTarget'>,
  shape: DvtSubstraitTransformAuthoringMetadata['shape'],
  draft: Pick<DvtSubstraitTransformAuthoringMetadata, 'plan' | 'sidecar'>
): DvtSubstraitTransformAuthoringMetadata {
  return {
    kind: 'transform',
    mode,
    ...disposition,
    shape,
    plan: draft.plan,
    sidecar: draft.sidecar,
  };
}

export function validateDvtTransformAuthoringMetadata(
  metadata: TransformMetadata
): DvtNodeAuthoringMetadataErrors {
  const errors: DvtNodeAuthoringMetadataErrors = VALID_MATERIALIZATIONS.has(
    metadata.materialized.trim()
  )
    ? {}
    : { materialization: 'dvt_materialization_invalid' };
  if (metadata.resultTarget != null) {
    const target = DvtTransformResultTargetV1Schema.safeParse(metadata.resultTarget);
    if (!target.success) {
      for (const issue of target.error.issues) {
        if (issue.path[0] === 'schema') errors.schema = 'dvt_identifier_invalid';
        else if (issue.path[0] === 'relation') errors.table = 'dvt_identifier_invalid';
        else errors.connectionRef = 'dvt_connection_required';
      }
    }
  }
  return errors;
}

export function applyDvtTransformAuthoringMetadata(
  node: CanonicalNode,
  metadata: TransformMetadata
): CanonicalNode {
  const materialized = metadata.materialized.trim();
  if (Object.keys(validateDvtTransformAuthoringMetadata(metadata)).length > 0) return node;
  const withMaterialization = (updatedNode: CanonicalNode): CanonicalNode => {
    const config = { ...readDvtNodeConfig(updatedNode), materialized } as Record<string, unknown>;
    if (metadata.resultTarget === null) delete config.resultTarget;
    else if (metadata.resultTarget !== undefined) config.resultTarget = metadata.resultTarget;
    return withDvtConfig(updatedNode, config);
  };
  if (metadata.mode === 'uninitialized') return withMaterialization(node);
  const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
  const indexed = indexSubstraitRelations(draft);
  if (!indexed.ok) throw indexed.error;
  return withMaterialization(
    applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitSemanticDocument(draft))
  );
}
