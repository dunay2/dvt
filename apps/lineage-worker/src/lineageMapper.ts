/**
 * Owned concern: compose SQL lineage mapping with the canonical artifact reader.
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @decision Configure existing generic artifact transports at the worker composition root
 * @consequence Traceability has no second reader, cache or integrity authority
 * @version 1.0.0
 */
import { S3Client } from '@aws-sdk/client-s3';
import { SqlJobFacetBuilder, StepStartedLineageMapper } from '@dvt/traceability-service';

import type { Env } from './env.js';

export function createStepStartedLineageMapper(env: Env): StepStartedLineageMapper {
  const s3Client = new S3Client({
    ...(env.DVT_ARTIFACT_S3_ENDPOINT === undefined
      ? {}
      : { endpoint: env.DVT_ARTIFACT_S3_ENDPOINT }),
    ...(env.DVT_ARTIFACT_S3_REGION === undefined ? {} : { region: env.DVT_ARTIFACT_S3_REGION }),
    forcePathStyle: env.DVT_ARTIFACT_S3_FORCE_PATH_STYLE,
  });

  return new StepStartedLineageMapper({
    artifactReadOptions: {
      nodeEnv: env.NODE_ENV,
      s3Client,
      ...(env.DVT_ARTIFACT_FILE_READ_ROOT === undefined
        ? {}
        : { fileReadRoot: env.DVT_ARTIFACT_FILE_READ_ROOT }),
    },
    sqlFacetBuilder: new SqlJobFacetBuilder(),
  });
}
