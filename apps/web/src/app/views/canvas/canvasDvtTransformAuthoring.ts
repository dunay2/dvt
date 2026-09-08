/** Owns decoding and persistence of canonical DVT Transform shapes. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type {
  DvtNodeAuthoringMetadataErrors,
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import { inspectDvtSubstraitPilotAggregateWindowDraft } from './canvasDvtSubstraitAggregateWindow';
import {
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinAcceptedDraft,
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
  const materialized = readMaterialized(node);
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) return { kind: 'transform', mode: 'uninitialized', materialized };
  const projection = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  if (
    inspectDvtSubstraitProjectionDraft(projection).ok ||
    inspectDvtSubstraitFilter(projection) != null
  ) {
    return fromDraft(authority.mode, materialized, 'projection', projection);
  }
  const pilot = decodeDvtSubstraitPilotDocument(authority.semanticDocument);
  if (
    inspectDvtSubstraitPilotDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregateWindowDraft(pilot).ok ||
    inspectDvtSubstraitPilotAggregationDraft(pilot).ok ||
    inspectDvtSubstraitPilotWindowDraft(pilot).ok
  ) {
    return fromDraft(authority.mode, materialized, 'pilot', pilot);
  }
  const join = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
  if (inspectDvtSubstraitInnerJoinAcceptedDraft(join).ok) {
    return fromDraft(authority.mode, materialized, 'inner_join', join);
  }
  const unionAll = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
  return fromDraft(authority.mode, materialized, 'union_all', unionAll);
}

function fromDraft(
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait,
  materialized: string,
  shape: DvtSubstraitTransformAuthoringMetadata['shape'],
  draft: Pick<DvtSubstraitTransformAuthoringMetadata, 'plan' | 'sidecar'>
): DvtSubstraitTransformAuthoringMetadata {
  return { kind: 'transform', mode, materialized, shape, plan: draft.plan, sidecar: draft.sidecar };
}

export function validateDvtTransformAuthoringMetadata(
  metadata: TransformMetadata
): DvtNodeAuthoringMetadataErrors {
  return VALID_MATERIALIZATIONS.has(normalizeDvtIdentifier(metadata.materialized, ''))
    ? {}
    : { materialization: 'dvt_materialization_invalid' };
}

export function applyDvtTransformAuthoringMetadata(
  node: CanonicalNode,
  metadata: TransformMetadata
): CanonicalNode {
  const withMaterialization = (updatedNode: CanonicalNode): CanonicalNode =>
    withDvtConfig(updatedNode, {
      ...readDvtNodeConfig(updatedNode),
      materialized: normalizeMaterialized(metadata.materialized),
    });
  if (metadata.mode === 'uninitialized') return withMaterialization(node);
  const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
  const document =
    metadata.shape === 'projection'
      ? inspectDvtSubstraitFilter(draft) == null
        ? encodeDvtSubstraitProjectionDocument(draft)
        : encodeDvtSubstraitFilterDocument(draft)
      : metadata.shape === 'inner_join'
        ? encodeDvtSubstraitInnerJoinDocument(draft)
        : metadata.shape === 'union_all'
          ? encodeDvtSubstraitUnionAllDocument(draft)
          : encodeDvtSubstraitPilotDocument(draft);
  return withMaterialization(applyDvtSubstraitSemanticDocument(node, document));
}
