/** Owns decoding and persistence of canonical DVT Transform shapes. */
import { DVT_TRANSFORM_AUTHORING_MODE, DvtTransformResultTargetV1Schema } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type {
  DvtNodeAuthoringMetadataErrors,
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import { inspectDvtSubstraitPilotAggregateWindowDraft } from './canvasDvtSubstraitAggregateWindow';
import {
  decodeDvtSubstraitJoinDocument,
  encodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinPredicateContext,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitUnionAllDocument,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';
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
import { inspectDvtSubstraitPilotWindowDraft } from './canvasDvtSubstraitWindow';
import {
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
} from './canvasDvtSubstraitFilter';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

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

export function createDvtTransformAuthoringMetadata(node: CanonicalNode): TransformMetadata {
  const config = readDvtNodeConfig(node);
  const disposition = {
    materialized: readMaterialized(node),
    ...(Object.hasOwn(config, 'resultTarget')
      ? { resultTarget: DvtTransformResultTargetV1Schema.parse(config.resultTarget) }
      : {}),
  };
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) return { kind: 'transform', mode: 'uninitialized', ...disposition };
  const projection = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  if (
    inspectDvtSubstraitProjectionDraft(projection).ok ||
    inspectDvtSubstraitFilter(projection) != null
  ) {
    return fromDraft(authority.mode, disposition, 'projection', projection);
  }
  const pilot = decodeDvtSubstraitPilotDocument(authority.semanticDocument);
  if (
    inspectDvtSubstraitPilotDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregateWindowDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregationDraft(pilot).ok ||
    inspectDvtSubstraitPilotWindowDraft(pilot).ok
  ) {
    return fromDraft(authority.mode, disposition, 'pilot', pilot);
  }
  const join = decodeDvtSubstraitJoinDocument(authority.semanticDocument);
  if (inspectDvtSubstraitJoinAcceptedDraft(join).ok) {
    const finalJoinType =
      inspectDvtSubstraitJoinPredicateContext(join)?.inspection.projection.joinRelations.at(
        -1
      )?.joinType;
    return fromDraft(
      authority.mode,
      disposition,
      finalJoinType == null ? 'inner_join' : canvasJoinOperationForType(finalJoinType),
      join
    );
  }
  const unionAll = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
  return fromDraft(authority.mode, disposition, 'union_all', unionAll);
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
  const document =
    metadata.shape === 'projection'
      ? inspectDvtSubstraitFilter(draft) == null
        ? encodeDvtSubstraitProjectionDocument(draft)
        : encodeDvtSubstraitFilterDocument(draft)
      : isCanvasJoinOperation(metadata.shape)
        ? encodeDvtSubstraitJoinDocument(draft)
        : metadata.shape === 'union_all'
          ? encodeDvtSubstraitUnionAllDocument(draft)
          : encodeDvtSubstraitPilotDocument(draft);
  return withMaterialization(applyDvtSubstraitSemanticDocument(node, document));
}
