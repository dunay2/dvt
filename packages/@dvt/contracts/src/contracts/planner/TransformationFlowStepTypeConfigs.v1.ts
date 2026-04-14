import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

import { GitArtifactRefSchema, type GitArtifactRef } from './TransformationFlowDesignGraph.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

export interface PreparePostgresTransformStepTypeConfig {
  targetSchema: string;
  sourceSchema: string;
  sourceTable: string;
  sourceAlias: string;
}

export interface PostgresSqlTransformStepTypeConfig {
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
  sinkSchema: string;
  sinkTable: string;
  materialization: 'table' | 'view';
  writeMode: 'replace' | 'append';
}

export const PreparePostgresTransformStepTypeConfigSchema = z
  .object({
    targetSchema: NonBlankStringSchema,
    sourceSchema: NonBlankStringSchema,
    sourceTable: NonBlankStringSchema,
    sourceAlias: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<PreparePostgresTransformStepTypeConfig>;

export const PostgresSqlTransformStepTypeConfigSchema = z
  .object({
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
    sinkSchema: NonBlankStringSchema,
    sinkTable: NonBlankStringSchema,
    materialization: z.enum(['table', 'view']),
    writeMode: z.enum(['replace', 'append']),
  })
  .strict() satisfies z.ZodType<CaptureMaterializationEvidenceStepTypeConfig>;
