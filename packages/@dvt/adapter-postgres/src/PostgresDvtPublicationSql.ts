/**
 * Owned concern: construct fixed PostgreSQL statements for stable-table publication.
 * @baseline ADR-0003: Execution Model
 * @decision Centralize identifier quoting and provider catalog queries outside orchestration.
 * @consequence Publication flow remains readable and SQL construction has one owner.
 * @version 1.0.0
 */
import { quoteIdentifier } from './sqlUtils.js';

export const CURRENT_DATABASE_SQL = 'SELECT current_database() AS database';
export const ACQUIRE_PUBLICATION_LOCK_SQL = 'SELECT pg_advisory_xact_lock($1, $2)';
export const TARGET_METADATA_SQL = `
SELECT
  c.oid::text AS oid,
  c.relkind AS "relationKind",
  r.rolname AS owner,
  current_user AS "currentRole",
  obj_description(c.oid, 'pg_class') AS marker,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
    WHERE acl.grantee <> c.relowner
      AND acl.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) AS "hasExternalWriteGrant",
  EXISTS (SELECT 1 FROM pg_constraint AS con WHERE con.conrelid = c.oid)
    OR EXISTS (SELECT 1 FROM pg_index AS idx WHERE idx.indrelid = c.oid)
    OR EXISTS (SELECT 1 FROM pg_trigger AS trg WHERE trg.tgrelid = c.oid AND NOT trg.tgisinternal)
    OR EXISTS (
      SELECT 1 FROM pg_rewrite AS rw WHERE rw.ev_class = c.oid AND rw.rulename <> '_RETURN'
    ) AS "hasMetadataDrift"
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_roles AS r ON r.oid = c.relowner
WHERE n.nspname = $1 AND c.relname = $2
`;

export const RELATION_COLUMNS_SQL = `
SELECT
  a.attnum - 1 AS ordinal,
  a.attname AS name,
  format_type(a.atttypid, a.atttypmod) AS "postgresType",
  NOT a.attnotnull AS nullable,
  CASE WHEN ad.adbin IS NULL THEN NULL ELSE pg_get_expr(ad.adbin, ad.adrelid) END
    AS "defaultExpression",
  CASE WHEN a.attgenerated = '' THEN NULL ELSE pg_get_expr(ad.adbin, ad.adrelid) END
    AS "generatedExpression",
  CASE WHEN coll.collname IS NULL OR coll.collname = 'default' THEN NULL ELSE coll.collname END
    AS collation
FROM pg_attribute AS a
JOIN pg_class AS c ON c.oid = a.attrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef AS ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
LEFT JOIN pg_collation AS coll ON coll.oid = a.attcollation
WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum
`;

export const TEMP_RELATION_COLUMNS_SQL = RELATION_COLUMNS_SQL.replace(
  'n.nspname = $1 AND c.relname = $2',
  'n.oid = pg_my_temp_schema() AND c.relname = $1'
);

export function createCandidateSql(candidate: string, projectionSql: string): string {
  return `CREATE TEMP TABLE ${quoteIdentifier(candidate)} ON COMMIT DROP AS ${projectionSql.trim()}`;
}

export function lockTargetSql(schema: string, relation: string): string {
  return `LOCK TABLE ${qualified(schema, relation)} IN SHARE ROW EXCLUSIVE MODE`;
}

export function createTargetSql(schema: string, relation: string, candidate: string): string {
  return `CREATE TABLE ${qualified(schema, relation)} (LIKE pg_temp.${quoteIdentifier(candidate)} INCLUDING ALL)`;
}

export function deleteTargetSql(schema: string, relation: string): string {
  return `DELETE FROM ${qualified(schema, relation)}`;
}

export function insertTargetSql(
  schema: string,
  relation: string,
  candidate: string,
  columns: readonly string[]
): string {
  const list = columns.map(quoteIdentifier).join(', ');
  return `INSERT INTO ${qualified(schema, relation)} (${list}) SELECT ${list} FROM pg_temp.${quoteIdentifier(candidate)}`;
}

export function countRelationSql(schema: string, relation: string): string {
  return `SELECT count(*)::text AS count FROM ${qualified(schema, relation)}`;
}

export function countCandidateSql(candidate: string): string {
  return `SELECT count(*)::text AS count FROM pg_temp.${quoteIdentifier(candidate)}`;
}

export function commentTargetSql(schema: string, relation: string, marker: string): string {
  return `COMMENT ON TABLE ${qualified(schema, relation)} IS ${quoteLiteral(marker)}`;
}

function qualified(schema: string, relation: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(relation)}`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
