import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';
import { ConnectionRefSchema, type ConnectionRef } from '../source-import/ConnectedSourceRef.v1.js';

import { GitArtifactRefSchema, type GitArtifactRef } from './PlanPreviewProvenance.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

export const PostgresConnectionRefSchema = ConnectionRefSchema.refine(
  (connectionRef) => connectionRef.provider === 'postgres',
  {
    message: 'SQL-first transformation steps require provider postgres.',
    path: ['provider'],
  }
);

export interface PreparePostgresTransformStepTypeConfig {
  connectionRef: ConnectionRef;
  targetSchema: string;
  sourceSchema: string;
  sourceTable: string;
  sourceAlias: string;
}

export interface PostgresSqlTransformStepTypeConfig {
  connectionRef: ConnectionRef;
  dialect: 'postgres';
  entrypoint: string;
  sql: string;
  sqlArtifact: GitArtifactRef;
  sourceSchema: string;
  sourceTable: string;
  sourceAlias: string;
  sinkSchema: string;
  sinkTable: string;
  materialization: 'table' | 'view';
  writeMode: 'replace' | 'append';
}

export interface CaptureMaterializationEvidenceStepTypeConfig {
  connectionRef: ConnectionRef;
  sinkSchema: string;
  sinkTable: string;
  materialization: 'table' | 'view';
  writeMode: 'replace' | 'append';
}

export const PreparePostgresTransformStepTypeConfigSchema = z
  .object({
    connectionRef: PostgresConnectionRefSchema,
    targetSchema: NonBlankStringSchema,
    sourceSchema: NonBlankStringSchema,
    sourceTable: NonBlankStringSchema,
    sourceAlias: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<PreparePostgresTransformStepTypeConfig>;

export const PostgresSqlTransformStepTypeConfigSchema = z
  .object({
    connectionRef: PostgresConnectionRefSchema,
    dialect: z.literal('postgres'),
    entrypoint: NonBlankStringSchema,
    sql: NonBlankStringSchema,
    sqlArtifact: GitArtifactRefSchema,
    sourceSchema: NonBlankStringSchema,
    sourceTable: NonBlankStringSchema,
    sourceAlias: NonBlankStringSchema,
    sinkSchema: NonBlankStringSchema,
    sinkTable: NonBlankStringSchema,
    materialization: z.enum(['table', 'view']),
    writeMode: z.enum(['replace', 'append']),
  })
  .strict() satisfies z.ZodType<PostgresSqlTransformStepTypeConfig>;

export const CaptureMaterializationEvidenceStepTypeConfigSchema = z
  .object({
    connectionRef: PostgresConnectionRefSchema,
    sinkSchema: NonBlankStringSchema,
    sinkTable: NonBlankStringSchema,
    materialization: z.enum(['table', 'view']),
    writeMode: z.enum(['replace', 'append']),
  })
  .strict() satisfies z.ZodType<CaptureMaterializationEvidenceStepTypeConfig>;
