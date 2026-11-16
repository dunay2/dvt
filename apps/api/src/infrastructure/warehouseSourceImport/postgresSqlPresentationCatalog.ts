/** Native catalog projections certify literal columns and conservative builtin scalar resolution. */
import type { Client } from 'pg';

import type {
  PostgresSqlPresentationEvidence,
  SqlPresentationRelation,
} from '../../application/ports/postgresSqlPresentationEvidence.js';
export const presentationScalarTypes = [
  'bool',
  'int2',
  'int4',
  'int8',
  'float4',
  'float8',
  'numeric',
  'text',
  'varchar',
  'bpchar',
];

export const presentationColumnsSql = `
  with wanted as (
    select * from jsonb_to_recordset($1::jsonb) as x(schema text, "table" text)
  )
  select w.schema, w."table", c.relkind as relation_kind, c.relrowsecurity as row_security,
         c.oid as relation_id, c.relhassubclass as has_subclasses, c.reloptions is null as options_clear,
         case when c.relkind = 'v' then pg_get_viewdef(c.oid, true) end as view_sql,
         has_table_privilege(c.oid, 'SELECT') as select_access, a.attname as column,
         (tn.nspname = 'pg_catalog' and t.typtype = 'b' and t.typname = any($2::text[])) as scalar
  from wanted w
  left join pg_namespace n on n.nspname = w.schema
  left join pg_class c on c.relnamespace = n.oid and c.relname = w."table"
  left join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_type t on t.oid = a.atttypid
  left join pg_namespace tn on tn.oid = t.typnamespace
  order by w.schema, w."table", a.attnum
  limit 10001`;

const presentationViewDependenciesSql = `
  select distinct n.nspname as schema, c.relname as "table"
  from pg_rewrite r join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = r.oid
  join pg_class c on c.oid = d.refobjid join pg_namespace n on n.oid = c.relnamespace
  where r.ev_class = any($1::oid[]) and r.rulename = '_RETURN'
    and d.refclassid = 'pg_class'::regclass and d.refobjid <> r.ev_class
  limit 129`;

// original_path is captured BEFORE setting the metadata transaction's trusted search_path.
// Reject all custom visible comparison overloads; merely being PostgreSQL is not a witness.
export const presentationScalarSemanticsSql = `
  with scalar_types as (
    select oid from pg_type where typnamespace = 'pg_catalog'::regnamespace and typname = any($2::text[])
  ), comparison_arguments as (
    select oid from scalar_types
    union select casttarget from pg_cast where castsource in (select oid from scalar_types) and castcontext = 'i'
  )
  select not exists (
    select 1 from pg_operator o join pg_namespace n on n.oid = o.oprnamespace
    where n.nspname = any($1::text[]) and n.nspname <> 'pg_catalog'
      and o.oprname = any(array['=', '<>', '!=', '<', '<=', '>', '>='])
  ) and not exists (
    select 1 from pg_operator o join pg_proc p on p.oid = o.oprcode
    join pg_namespace pn on pn.oid = p.pronamespace
    where o.oprnamespace = 'pg_catalog'::regnamespace
      and o.oprleft in (select oid from comparison_arguments) and o.oprright in (select oid from comparison_arguments)
      and o.oprname = any(array['=', '<>', '!=', '<', '<=', '>', '>='])
      and (pn.nspname <> 'pg_catalog' or p.provolatile <> 'i')
  ) and not exists (
    select 1 from pg_cast c join pg_type t on t.oid = c.casttarget
    left join pg_proc p on p.oid = c.castfunc
    where c.castsource in (select oid from scalar_types) and c.castcontext = 'i'
      and (t.typnamespace <> 'pg_catalog'::regnamespace
        or (c.castmethod = 'f' and p.pronamespace <> 'pg_catalog'::regnamespace))
  ) and not exists (
    select 1 from pg_cast c join pg_type s on s.oid = c.castsource
    join pg_type t on t.oid = c.casttarget
    left join pg_proc p on p.oid = c.castfunc
    where s.typnamespace = 'pg_catalog'::regnamespace and s.typname = any($2::text[])
      and ((c.castcontext = 'i' and exists (
        select 1 from pg_operator o where o.oprnamespace = 'pg_catalog'::regnamespace
          and o.oprname = any(array['=', '<>', '!=', '<', '<=', '>', '>='])
          and (o.oprleft = c.casttarget or o.oprright = c.casttarget)
      )) or t.oid in (select oid from scalar_types))
      and (t.typnamespace <> 'pg_catalog'::regnamespace
        or (c.castmethod = 'f' and (p.pronamespace <> 'pg_catalog'::regnamespace or p.provolatile <> 'i')))
  ) and not exists (
    select 1 from pg_type t join pg_proc i on i.oid = t.typinput join pg_proc o on o.oid = t.typoutput
    where t.oid in (select oid from scalar_types)
      and (i.pronamespace <> 'pg_catalog'::regnamespace or o.pronamespace <> 'pg_catalog'::regnamespace
        or i.provolatile <> 'i' or o.provolatile <> 'i')
  ) and not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = any($1::text[]) and n.nspname <> 'pg_catalog'
      and t.typname = any(array['bigint', 'int8', 'float8', 'text', 'boolean', 'bool'])
  ) as scalar_semantics`;

type CatalogColumn = {
  schema: string;
  table: string;
  column: string | null;
  relation_kind: string | null;
  row_security: boolean | null;
  select_access: boolean | null;
  scalar: boolean | null;
  relation_id: number;
  has_subclasses: boolean;
  options_clear: boolean;
  view_sql: string | null;
};
const addressKey = (relation: SqlPresentationRelation): string =>
  JSON.stringify([relation.schema, relation.table]);

/** Read only the selected closure, retaining view boundaries and never sampling data. */
export async function readPostgresSqlPresentationCatalog(
  client: Pick<Client, 'query'>,
  input: Readonly<{
    relations: readonly SqlPresentationRelation[];
    currentDatabase: string;
    originalPath: readonly string[];
  }>
): Promise<PostgresSqlPresentationEvidence | null> {
  const resolved = new Map<
    string,
    { schema: string; table: string; columns: string[]; scalarColumns: string[] }
  >();
  const views = new Map<string, { schema: string; table: string; sql: string }>();
  let pending = [
    ...new Map(
      input.relations.map(({ schema, table }) => [addressKey({ schema, table }), { schema, table }])
    ).values(),
  ];
  let columnCount = 0,
    definitionSize = 0;
  while (pending.length > 0) {
    if (resolved.size + pending.length > 128) return null;
    const batch = new Map(
      pending.map((relation) => [
        addressKey(relation),
        { ...relation, columns: [] as string[], scalarColumns: [] as string[] },
      ])
    );
    const rows = await client.query<CatalogColumn>(presentationColumnsSql, [
      JSON.stringify(pending),
      presentationScalarTypes,
    ]);
    if ((columnCount += rows.rows.length) > 10000) return null;
    const viewIds = new Set<number>();
    for (const row of rows.rows) {
      const key = addressKey(row),
        relation = batch.get(key);
      if (
        relation === undefined ||
        !row.column ||
        typeof row.scalar !== 'boolean' ||
        !row.select_access ||
        row.row_security !== false ||
        row.has_subclasses !== false ||
        !['r', 'p', 'm', 'v'].includes(row.relation_kind ?? '') ||
        relation.columns.includes(row.column)
      )
        return null;
      relation.columns.push(row.column);
      if (row.scalar) relation.scalarColumns.push(row.column);
      if (row.relation_kind === 'v') {
        if (!row.options_clear || !row.view_sql || row.view_sql.length > 65536) return null;
        viewIds.add(row.relation_id);
        if (!views.has(key)) {
          definitionSize += row.view_sql.length;
          if (definitionSize > 262144) return null;
          views.set(key, { schema: row.schema, table: row.table, sql: row.view_sql });
        }
      }
    }
    if ([...batch.values()].some((relation) => relation.columns.length === 0)) return null;
    for (const [key, relation] of batch) resolved.set(key, relation);
    const dependencies =
      viewIds.size === 0
        ? []
        : (
            await client.query<{ schema: string; table: string }>(presentationViewDependenciesSql, [
              [...viewIds],
            ])
          ).rows;
    if (dependencies.length > 128) return null;
    pending = [
      ...new Map(
        dependencies
          .filter((relation) => !resolved.has(addressKey(relation)))
          .map((relation) => [addressKey(relation), relation])
      ).values(),
    ];
  }
  const semantics = await client.query<{ scalar_semantics: boolean }>(
    presentationScalarSemanticsSql,
    [input.originalPath, presentationScalarTypes]
  );
  return {
    currentDatabase: input.currentDatabase,
    resolvedColumns: [...resolved.values()].map(({ scalarColumns, ...relation }) => ({
      ...relation,
      ...(scalarColumns.length === relation.columns.length ? {} : { scalarColumns }),
    })),
    ...(views.size === 0 ? {} : { viewDefinitions: [...views.values()] }),
    ...(semantics.rows.length === 1 && semantics.rows[0]?.scalar_semantics === true
      ? { scalarSemantics: 'pg_catalog' as const }
      : {}),
  };
}
