/** Owned concern: project only authoritative imported Source column facts. */
import {
  SourceObjectColumnSchema,
  SourceObjectConstraintSchema,
  resolveSourceObjectColumnConstraintSemantics,
  type SourceObjectColumn,
} from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';

export type SourceColumnFacts = Readonly<{
  column: Pick<SourceObjectColumn, 'name' | 'type'> & Partial<Pick<SourceObjectColumn, 'nullable'>>;
  primaryKey: boolean;
  independentlyUnique: boolean;
}>;

export type SourceColumnFilter = 'all' | 'key' | 'not-null' | 'nullable';

export function readSourceColumnFacts(
  node: Pick<CanonicalNode, 'metadata'>
): readonly SourceColumnFacts[] {
  const columns = SourceObjectColumnSchema.partial({ nullable: true })
    .array()
    .safeParse(node.metadata?.columns);
  if (!columns.success) return [];
  const constraints = SourceObjectConstraintSchema.array().safeParse(node.metadata?.constraints);
  return columns.data.map((column) => ({
    column,
    ...resolveSourceObjectColumnConstraintSemantics(
      { constraints: constraints.success ? constraints.data : [] },
      column.name
    ),
  }));
}

export function matchesSourceColumn(
  facts: SourceColumnFacts,
  query: string,
  filter: SourceColumnFilter
): boolean {
  if (!facts.column.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
  switch (filter) {
    case 'key':
      return facts.primaryKey || facts.independentlyUnique;
    case 'not-null':
      return facts.column.nullable === false;
    case 'nullable':
      return facts.column.nullable === true;
    case 'all':
      return true;
  }
}

/** A visual cue, not a provider type ontology or source-type coercion. */
export function resolveTypeCue(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (/(^|\W)(char|varchar|text|string)/.test(normalized)) return 'T';
  if (/(json|jsonb|array|struct|map)/.test(normalized)) return '{}';
  if (/uuid/.test(normalized)) return 'U';
  if (/(date|time|timestamp|interval)/.test(normalized)) return 'DT';
  if (/(inet|cidr|macaddr)/.test(normalized)) return 'IP';
  if (/(int|numeric|decimal|number|real|double|float|serial)/.test(normalized)) return '#';
  if (/(bool|boolean)/.test(normalized)) return 'B';
  if (/(bytea|binary|blob)/.test(normalized)) return '01';
  return '·';
}
