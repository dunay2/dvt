/**
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Seed candidates only from pinned core and official extension identities.
 * @consequence Candidate presence does not imply DVT support.
 * @version 1.0.0
 */
import {
  DvtSubstraitStandardCapabilityV1Schema,
  type DvtSubstraitStandardCapabilityV1,
} from './DvtSubstraitCapabilityCatalogSchema.v1.js';
import {
  buildDvtSubstraitStandardCapabilityId,
  type DvtSubstraitCapabilityCategory,
} from './DvtSubstraitCapabilityIdentity.v1.js';

const STUDY = 'dvt:#2640';
const ALGEBRA = [STUDY, 'substrait:v0.101.0:proto/substrait/algebra.proto'];
const TYPES = [STUDY, 'substrait:v0.101.0:proto/substrait/type.proto'];
const extensionEvidence = (family: string): string[] => [
  STUDY,
  `substrait:v0.101.0:extensions/${family}.yaml`,
];

function coreCandidate(
  category: DvtSubstraitCapabilityCategory,
  message: string,
  selector: string | undefined,
  evidenceRefs: readonly string[]
): DvtSubstraitStandardCapabilityV1 {
  const identity = { sourceKind: 'core' as const, message, ...(selector ? { selector } : {}) };
  return DvtSubstraitStandardCapabilityV1Schema.parse({
    kind: 'standard',
    entryId: buildDvtSubstraitStandardCapabilityId(category, identity),
    category,
    identity,
    profileStatus: 'candidate-standard',
    evidenceRefs,
  });
}

function extensionCandidate(
  category: 'scalar-function' | 'aggregate-function' | 'window-function',
  family: string,
  name: string
): DvtSubstraitStandardCapabilityV1 {
  const urn = `extension:io.substrait:${family}`;
  const identity = { sourceKind: 'simple-extension' as const, urn, name };
  return DvtSubstraitStandardCapabilityV1Schema.parse({
    kind: 'standard',
    entryId: buildDvtSubstraitStandardCapabilityId(category, identity),
    category,
    identity,
    profileStatus: 'candidate-standard',
    evidenceRefs: extensionEvidence(family),
  });
}

const CORE_RELATIONS: readonly [string, string?][] = [
  ['substrait.ReadRel', 'read_type.named_table'],
  ['substrait.RelCommon', 'emit_kind.emit'],
  ['substrait.ProjectRel'],
  ['substrait.FilterRel'],
  ['substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER'],
  ['substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT'],
  ['substrait.AggregateRel'],
  ['substrait.SetRel', 'SetOp.SET_OP_UNION_DISTINCT'],
  ['substrait.SetRel', 'SetOp.SET_OP_UNION_ALL'],
  ['substrait.SetRel', 'SetOp.SET_OP_INTERSECTION_MULTISET'],
  ['substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY'],
  ['substrait.SortRel'],
  ['substrait.FetchRel'],
];
const EXPRESSION_SELECTORS = [
  'rex_type.literal',
  'rex_type.selection',
  'rex_type.scalar_function',
  'rex_type.cast',
  'rex_type.if_then',
  'rex_type.window_function',
] as const;
const CORE_TYPES = [
  'bool',
  'i32',
  'i64',
  'fp64',
  'string',
  'date',
  'decimal',
  'precision_timestamp',
  'precision_timestamp_tz',
  'struct',
  'uuid',
] as const;

export const DVT_SUBSTRAIT_STANDARD_CANDIDATES_V1: readonly DvtSubstraitStandardCapabilityV1[] = [
  ...CORE_RELATIONS.map(([message, selector]) =>
    coreCandidate('relation', message, selector, ALGEBRA)
  ),
  ...EXPRESSION_SELECTORS.map((selector) =>
    coreCandidate('expression-form', 'substrait.Expression', selector, ALGEBRA)
  ),
  ...['trim', 'upper', 'lower', 'concat', 'concat_ws'].map((name) =>
    extensionCandidate('scalar-function', 'functions_string', name)
  ),
  ...['coalesce', 'equal', 'not_equal', 'gt', 'gte', 'lt', 'lte', 'is_null', 'is_not_null'].map(
    (name) => extensionCandidate('scalar-function', 'functions_comparison', name)
  ),
  extensionCandidate('scalar-function', 'functions_boolean', 'and'),
  extensionCandidate('aggregate-function', 'functions_aggregate_generic', 'count'),
  extensionCandidate('aggregate-function', 'functions_arithmetic', 'sum'),
  extensionCandidate('aggregate-function', 'functions_arithmetic_decimal', 'sum'),
  extensionCandidate('window-function', 'functions_arithmetic', 'row_number'),
  ...CORE_TYPES.map((selector) =>
    coreCandidate('type', 'substrait.Type', `kind.${selector}`, TYPES)
  ),
];
