/** Admission evidence attached to supported entries during catalog composition. */
import {
  DvtSubstraitStandardAdmissionEvidenceV1Schema,
  type DvtSubstraitStandardAdmissionEvidenceV1,
} from './DvtSubstraitCapabilityAdmission.v1.js';
import {
  DvtSubstraitStandardCapabilityV1Schema,
  type DvtSubstraitStandardCapabilityV1,
} from './DvtSubstraitCapabilityCatalogSchema.v1.js';
import {
  buildDvtSubstraitStandardCapabilityId,
  type DvtSubstraitCapabilityCategory,
} from './DvtSubstraitCapabilityIdentity.v1.js';

const standardId = (
  category: DvtSubstraitCapabilityCategory,
  message: string,
  selector?: string
): string =>
  buildDvtSubstraitStandardCapabilityId(category, {
    sourceKind: 'core',
    message,
    ...(selector ? { selector } : {}),
  });
const functionId = (
  category: 'scalar-function' | 'aggregate-function' | 'window-function',
  family: string,
  name: string
): string =>
  buildDvtSubstraitStandardCapabilityId(category, {
    sourceKind: 'simple-extension',
    urn: `extension:io.substrait:${family}`,
    name,
  });

const LOWER_ID = functionId('scalar-function', 'functions_string', 'lower');
const PILOT_IDS = new Set([
  standardId('relation', 'substrait.ReadRel', 'read_type.named_table'),
  standardId('relation', 'substrait.RelCommon', 'emit_kind.emit'),
  standardId('relation', 'substrait.ProjectRel'),
  standardId('expression-form', 'substrait.Expression', 'rex_type.selection'),
  standardId('expression-form', 'substrait.Expression', 'rex_type.scalar_function'),
  standardId('type', 'substrait.Type', 'kind.string'),
  functionId('scalar-function', 'functions_string', 'trim'),
  functionId('scalar-function', 'functions_string', 'upper'),
  LOWER_ID,
]);
const JOIN_IDS = new Set([
  standardId('relation', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER'),
  functionId('scalar-function', 'functions_comparison', 'equal'),
  standardId('type', 'substrait.Type', 'kind.bool'),
]);
const AGGREGATE_IDS = new Set([
  standardId('relation', 'substrait.AggregateRel'),
  functionId('aggregate-function', 'functions_aggregate_generic', 'count'),
  standardId('type', 'substrait.Type', 'kind.i64'),
]);
const WINDOW_IDS = new Set([
  standardId('expression-form', 'substrait.Expression', 'rex_type.window_function'),
  functionId('window-function', 'functions_arithmetic', 'row_number'),
]);
const CALCULATED_IDS = new Set([
  standardId('expression-form', 'substrait.Expression', 'rex_type.literal'),
  standardId('type', 'substrait.Type', 'kind.precision_timestamp_tz'),
]);
const UNION_ALL_IDS = new Set([
  standardId('relation', 'substrait.SetRel', 'SetOp.SET_OP_UNION_ALL'),
]);

function featureRefs(entryId: string): readonly string[] {
  if (entryId === LOWER_ID) return ['dvt:#2598', 'dvt:#2827'];
  if (PILOT_IDS.has(entryId)) return ['dvt:#2598'];
  if (JOIN_IDS.has(entryId) || UNION_ALL_IDS.has(entryId)) return ['dvt:#2634'];
  if (AGGREGATE_IDS.has(entryId) || WINDOW_IDS.has(entryId)) return ['dvt:#2641', 'dvt:#2642'];
  if (CALCULATED_IDS.has(entryId)) return ['dvt:#2833'];
  return [];
}

function proofRef(entryId: string): string {
  if (AGGREGATE_IDS.has(entryId)) return 'docs/evidence/ED-20260831-vtx2-substrait-grouping.md';
  if (WINDOW_IDS.has(entryId))
    return 'docs/evidence/ED-20260831-vtx2-substrait-row-number-window.md';
  if (CALCULATED_IDS.has(entryId))
    return 'docs/evidence/ED-20260902-canvas-calculated-column-authoring.md';
  if (UNION_ALL_IDS.has(entryId)) return 'docs/evidence/ED-20260831-vtx2-substrait-union-all.md';
  if (entryId === LOWER_ID)
    return 'docs/evidence/ED-20260902-transform-function-alias-authoring.md';
  return 'docs/evidence/ED-20260826-vtx2-substrait-card-pilot.md';
}

function admissionFor(
  entry: DvtSubstraitStandardCapabilityV1,
  useCaseRefs: readonly string[]
): DvtSubstraitStandardAdmissionEvidenceV1 {
  const proof = proofRef(entry.entryId);
  const identityRef = entry.evidenceRefs.find((reference) => reference.startsWith('substrait:'));
  if (identityRef === undefined) throw new Error(`Missing standard evidence for ${entry.entryId}.`);
  return DvtSubstraitStandardAdmissionEvidenceV1Schema.parse({
    kind: 'standard-admission',
    productUseCaseRef: useCaseRefs[useCaseRefs.length - 1],
    standardIdentityRef: identityRef,
    canonicalFixtureRef: proof,
    semanticValidationRef: proof,
    negativeValidationRef: proof,
    stableIdentity: {
      status: 'proved',
      evidenceRefs: ['docs/evidence/ED-20260903-vtx2-durable-semantic-document.md'],
    },
    targetConformance: [{ targetId: 'postgres', status: 'mapped', evidenceRefs: [proof] }],
    visualExposure: { status: 'exposed', evidenceRefs: [proof] },
  });
}

export function admitDvtSubstraitStandardCandidatesV1(
  candidates: readonly DvtSubstraitStandardCapabilityV1[]
): DvtSubstraitStandardCapabilityV1[] {
  return candidates.map((entry) => {
    const useCaseRefs = featureRefs(entry.entryId);
    return useCaseRefs.length === 0
      ? entry
      : DvtSubstraitStandardCapabilityV1Schema.parse({
          ...entry,
          profileStatus: 'supported-profile',
          evidenceRefs: [...entry.evidenceRefs, ...useCaseRefs],
          admission: admissionFor(entry, useCaseRefs),
        });
  });
}
