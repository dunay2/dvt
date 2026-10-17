/**
 * Owned concern: versioned, scoped DuckDB metadata and validation of internal generation locators.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Keep staging outside READY; bind values and validate persisted contracts on every read.
 * @consequence This module is infrastructure-only; metadata corruption never becomes an empty dataset.
 */
import type { DuckDBConnection } from '@duckdb/node-api';
import {
  LocalDataAcquisitionRequestV1Schema, LocalDataGenerationManifestV1Schema,
  LocalDataCaptureIdV1Schema, LocalDataGenerationIdV1Schema, LocalDatasetIdV1Schema,
  createLocalDataRequestFingerprintV1,
  type LocalDataAcquisitionRequestV1, type LocalDataGenerationManifestV1,
} from '@dvt/contracts';

import { DuckDbGenerationError, generationColumnSql, internalGenerationRelation } from './duckDbGenerationProfile.js';

const TABLES = ['dataset_heads', 'generation_manifests', 'staged_captures', 'storage_info'];
const VERSION = 'local-generation-store.v1';
export type GenerationStage = Readonly<{
  dataset: string; capture: string; generation: string; request: LocalDataAcquisitionRequestV1;
  fingerprint: string; expected: string | null; key: string; rows: bigint; bytes: bigint; sealed: boolean;
}>;
export async function initializeGenerationMetadata(c: DuckDBConnection, scopeJson: string): Promise<void> {
  if (!(await hasCompleteGenerationCatalog(c))) {
    // Only a genuinely absent reserved catalog may bootstrap. Never rebuild over retained data.
    await c.run('CREATE SCHEMA dvt_meta; CREATE SCHEMA dvt_store');
    await c.run('CREATE TABLE dvt_meta.storage_info (singleton BOOLEAN PRIMARY KEY CHECK(singleton), version VARCHAR NOT NULL, scope_json VARCHAR NOT NULL)');
    await c.run('CREATE TABLE dvt_meta.dataset_heads (local_dataset_id VARCHAR PRIMARY KEY, generation_id VARCHAR NOT NULL)');
    await c.run(`CREATE TABLE dvt_meta.staged_captures (
      capture_id VARCHAR PRIMARY KEY, local_dataset_id VARCHAR NOT NULL, generation_id VARCHAR UNIQUE NOT NULL,
      request_json VARCHAR NOT NULL, request_fingerprint VARCHAR NOT NULL, expected_head VARCHAR,
      relation_key VARCHAR UNIQUE NOT NULL, row_count UBIGINT NOT NULL, logical_bytes UBIGINT NOT NULL,
      sealed BOOLEAN NOT NULL)`);
    await c.run(`CREATE TABLE dvt_meta.generation_manifests (
      generation_id VARCHAR PRIMARY KEY, local_dataset_id VARCHAR NOT NULL, capture_id VARCHAR UNIQUE NOT NULL,
      request_fingerprint VARCHAR NOT NULL, relation_key VARCHAR UNIQUE NOT NULL, manifest_json VARCHAR NOT NULL)`);
    await c.run('INSERT INTO dvt_meta.storage_info VALUES (true, $1, $2)', [VERSION, scopeJson]);
  }
  await validateGenerationStorageIdentity(c, scopeJson);
}
/** Read inside the caller's transaction; partial or altered reserved catalogs are not empty stores. */
async function hasCompleteGenerationCatalog(c: DuckDBConnection): Promise<boolean> {
  const schemas = (await c.runAndReadAll(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('dvt_meta','dvt_store') ORDER BY schema_name"
  )).getRows();
  const tables = (await c.runAndReadAll(
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='dvt_meta' ORDER BY table_name"
  )).getRows();
  if (schemas.length === 0 && tables.length === 0) return false;
  if (JSON.stringify(schemas) !== JSON.stringify([['dvt_meta'], ['dvt_store']]) ||
      JSON.stringify(tables) !== JSON.stringify(TABLES.map(name => [name, 'BASE TABLE']))) {
    throw new DuckDbGenerationError('CORRUPT_METADATA');
  }
  return true;
}
export async function validateGenerationStorageIdentity(c: DuckDBConnection, scopeJson: string) {
  if (!(await hasCompleteGenerationCatalog(c))) throw new DuckDbGenerationError('CORRUPT_METADATA');
  const rows = (await c.runAndReadAll('SELECT singleton, version, scope_json FROM dvt_meta.storage_info')).getRows();
  if (rows.length !== 1 || rows[0]![0] !== true || rows[0]![1] !== VERSION || rows[0]![2] !== scopeJson) {
    throw new DuckDbGenerationError('STORAGE_IDENTITY_MISMATCH');
  }
}
export async function readGenerationStage(c: DuckDBConnection, capture: string): Promise<GenerationStage> {
  const rows = (await c.runAndReadAll(`SELECT local_dataset_id, capture_id, generation_id, request_json,
    request_fingerprint, expected_head, relation_key, row_count, logical_bytes, sealed
    FROM dvt_meta.staged_captures WHERE capture_id=$1`, [capture])).getRows();
  if (!rows.length) throw new DuckDbGenerationError('CAPTURE_MISSING');
  try {
    if (rows.length !== 1) throw new Error();
    const [dataset, id, generation, json, fingerprint, expected, key, count, bytes, sealed] = rows[0]!;
    const request = LocalDataAcquisitionRequestV1Schema.parse(JSON.parse(String(json)));
    generationColumnSql(request.schema.columns); internalGenerationRelation(key);
    if (fingerprint !== createLocalDataRequestFingerprintV1(request) ||
        typeof count !== 'bigint' || count < 0n || typeof bytes !== 'bigint' || bytes < 0n ||
        typeof sealed !== 'boolean') throw new Error();
    return { dataset: LocalDatasetIdV1Schema.parse(dataset), capture: LocalDataCaptureIdV1Schema.parse(id),
      generation: LocalDataGenerationIdV1Schema.parse(generation), request, fingerprint,
      expected: expected === null ? null : LocalDataGenerationIdV1Schema.parse(expected),
      key: String(key), rows: count, bytes, sealed };
  } catch { throw new DuckDbGenerationError('CORRUPT_METADATA'); }
}
export async function validateGenerationRelation(c: DuckDBConnection, stage: GenerationStage): Promise<void> {
  const relation = internalGenerationRelation(stage.key);
  const columns = (await c.runAndReadAll(`SELECT column_name, data_type, is_nullable
    FROM information_schema.columns WHERE table_schema='dvt_store' AND table_name=$1 ORDER BY ordinal_position`,
    [stage.key])).getRows();
  const expected = stage.request.schema.columns.map(col => [`c${col.ordinal}`, col.localType, col.nullable ? 'YES' : 'NO']);
  if (JSON.stringify(columns) !== JSON.stringify(expected)) throw new DuckDbGenerationError('SCHEMA_MISMATCH');
  const count = (await c.runAndReadAll(`SELECT count(*) FROM ${relation}`)).getRows()[0]?.[0];
  if (count !== stage.rows) throw new DuckDbGenerationError('ROW_COUNT_MISMATCH');
}
export async function readStoredGeneration(c: DuckDBConnection, dataset: string, generation: string): Promise<LocalDataGenerationManifestV1 | null> {
  const rows = (await c.runAndReadAll(`SELECT manifest_json, capture_id, request_fingerprint, relation_key
    FROM dvt_meta.generation_manifests WHERE local_dataset_id=$1 AND generation_id=$2`, [dataset, generation])).getRows();
  if (!rows.length) return null;
  let manifest: LocalDataGenerationManifestV1;
  try { manifest = LocalDataGenerationManifestV1Schema.parse(JSON.parse(String(rows[0]![0]))); }
  catch { throw new DuckDbGenerationError('CORRUPT_METADATA'); }
  const stage = await readGenerationStage(c, manifest.captureId);
  if (rows.length !== 1 || manifest.localDatasetId !== dataset || manifest.generationId !== generation ||
      rows[0]![1] !== manifest.captureId || rows[0]![2] !== manifest.requestFingerprint ||
      rows[0]![3] !== stage.key || !stage.sealed || stage.dataset !== dataset || stage.generation !== generation ||
      stage.fingerprint !== manifest.requestFingerprint || stage.rows !== BigInt(manifest.rowCount) ||
      (manifest.logicalByteCount !== undefined && stage.bytes !== BigInt(manifest.logicalByteCount))) {
    throw new DuckDbGenerationError('CORRUPT_METADATA');
  }
  await validateGenerationRelation(c, stage);
  return manifest;
}
