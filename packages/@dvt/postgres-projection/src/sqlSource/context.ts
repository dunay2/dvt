/** Own one compilation's canonical messages, derived schemas and lexical bindings. */
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  DVT_SUBSTRAIT_SPEC_VERSION,
  type ConnectedSourceRef,
  type ModelSqlDiagnostic,
  type ModelSqlInputAddition,
} from '@dvt/contracts';
import {
  deriveRelationSchema,
  type IndexedRelation,
  type SchemaField,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import type { PostgresAstNode } from '../postgresAst.js';

export type ModelSqlSourceColumn = Readonly<{ id: string; name: string; type: Type }>;
export type ModelSqlSourceInput = Readonly<{
  nodeId: string;
  sqlName: string;
  columns: readonly ModelSqlSourceColumn[];
  source:
    | Readonly<{
        sourceRef: ConnectedSourceRef;
        names: readonly string[];
        columns?: readonly ModelSqlSourceColumn[];
      }>
    | Readonly<{ producer: Readonly<{ nodeId: string; document: SubstraitDocument }> }>;
  retainedRead?: IndexedRelation;
}>;
export type ModelSqlSourceContext = Readonly<{
  inputs: readonly ModelSqlSourceInput[];
  currentDocument?: SubstraitDocument | null;
  retainedDocuments?: readonly SubstraitDocument[];
}>;
export type SqlNameBinding = Readonly<{
  name: string;
  qualifier: string | null;
  physicalPath?: readonly string[];
  ordinal: number;
}>;
export type SqlScope = Readonly<{ entry: IndexedRelation; bindings: readonly SqlNameBinding[] }>;
export type SqlNameScope = Readonly<{
  bindings: readonly SqlNameBinding[];
  schema: readonly SchemaField[];
}>;
export type SqlCompilationState = {
  context: ModelSqlSourceContext;
  plan: Plan;
  entries: IndexedRelation[];
  schemas: Map<string, readonly SchemaField[]>;
  readOrigins: Map<string, ModelSqlInputAddition>;
  consumed: Map<string, ModelSqlInputAddition>;
  usedReadIds: Set<string>;
  retainedReads: Map<string, IndexedRelation>;
  remainingNodes: number;
};

export class ModelSqlSourceError extends Error {
  public constructor(
    readonly code: ModelSqlDiagnostic['code'],
    message: string,
    readonly byteOffset?: number
  ) {
    super(message);
    this.name = 'ModelSqlSourceError';
  }
}
export function sourceError(
  code: ModelSqlDiagnostic['code'],
  message: string,
  node?: PostgresAstNode
): never {
  const location = node?.['location'];
  throw new ModelSqlSourceError(
    code,
    message,
    typeof location === 'number' && location >= 0 ? location : undefined
  );
}
export function sqlObject(value: unknown): PostgresAstNode {
  if (value == null || typeof value !== 'object' || Array.isArray(value))
    return sourceError(
      'unsupported_sql',
      'Expected PostgreSQL syntax in the admitted source profile.'
    );
  return value as PostgresAstNode;
}
export function sqlList(value: unknown): readonly unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value))
    return sourceError('unsupported_sql', 'Expected a PostgreSQL syntax list.');
  return value;
}
export function sourceBudget(state: SqlCompilationState): void {
  state.remainingNodes -= 1;
  if (state.remainingNodes < 0)
    sourceError('unsupported_sql', 'SQL exceeds the bounded source complexity.');
}
export function createSqlCompilationState(context: ModelSqlSourceContext): SqlCompilationState {
  if (new Set(context.inputs.map((input) => input.sqlName)).size !== context.inputs.length)
    sourceError('ambiguous_reference', 'The logical input namespace is ambiguous.');
  const [majorNumber, minorNumber, patchNumber] = DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);
  return {
    context,
    plan: create(PlanSchema, {
      version: {
        majorNumber: majorNumber!,
        minorNumber: minorNumber!,
        patchNumber: patchNumber!,
        producer: 'dvt-model-sql',
      },
    }),
    entries: [],
    schemas: new Map(),
    readOrigins: new Map(),
    consumed: new Map(),
    usedReadIds: new Set(),
    retainedReads: new Map(),
    remainingNodes: 2048,
  };
}
export function nextSourceRelation(state: SqlCompilationState): IndexedRelation['binding'] {
  sourceBudget(state);
  return { relationId: allocateDvtRelationId(), relAnchor: state.entries.length + 1 };
}
export function sourceOutputFields(
  relationId: string,
  names: readonly string[],
  sources: readonly (string | undefined)[] = []
): IndexedRelation['fields'] {
  return names.map((displayName, outputOrdinal) => ({
    relationId,
    fieldId: allocateDvtFieldId(),
    displayName,
    outputOrdinal,
    ...(sources[outputOrdinal] == null ? {} : { sourceFieldId: sources[outputOrdinal] }),
  }));
}
export function appendSourceRelation(
  state: SqlCompilationState,
  entry: Omit<IndexedRelation, 'consumers'>
): IndexedRelation {
  if (entry.fields.length > 4096 || state.entries.length >= 512)
    sourceError('unsupported_sql', 'The proposed relation exceeds the bounded source profile.');
  const complete = { ...entry, consumers: [] };
  state.schemas.set(
    entry.binding.relationId,
    deriveRelationSchema(
      complete,
      entry.inputs.map(
        (id) =>
          state.schemas.get(id) ?? sourceError('invalid_model', 'A relation input is missing.')
      )
    )
  );
  state.entries.push(complete);
  return complete;
}
export function sourceNameScope(state: SqlCompilationState, scope: SqlScope): SqlNameScope {
  return { bindings: scope.bindings, schema: state.schemas.get(scope.entry.binding.relationId)! };
}
export function consumeSourceOrdinal(
  state: SqlCompilationState,
  scope: SqlNameScope,
  ordinal: number
): void {
  const field = scope.schema[ordinal];
  if (
    field == null ||
    field.type.kind.case == null ||
    !['string', 'bool', 'i64', 'fp64', 'precisionTimestampTz'].includes(field.type.kind.case)
  )
    sourceError('unknown_type', 'The referenced field has no admitted canonical type.');
  for (const id of field.sourceFieldIds) {
    const origin = state.readOrigins.get(id);
    if (origin != null)
      state.consumed.set(JSON.stringify([origin.nodeId, origin.columnId]), origin);
  }
}
