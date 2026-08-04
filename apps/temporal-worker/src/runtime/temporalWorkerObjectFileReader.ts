/**
 * @ownedConcern Adapt governed artifact URIs to the object-file plugin reader port.
 */
import { S3Client } from '@aws-sdk/client-s3';
import { readArtifact } from '@dvt/artifacts';
import type { ContentAddressedObjectReader } from '@dvt/temporal-object-file-postgres-plugin';

import type { Env } from '../plugins/env.js';

export function createTemporalWorkerObjectFileReader(env: Env): ContentAddressedObjectReader {
  const s3Client = new S3Client({
    ...(env.DVT_OBJECT_FILE_S3_ENDPOINT === undefined
      ? {}
      : { endpoint: env.DVT_OBJECT_FILE_S3_ENDPOINT }),
    ...(env.DVT_OBJECT_FILE_S3_REGION === undefined
      ? {}
      : { region: env.DVT_OBJECT_FILE_S3_REGION }),
    forcePathStyle: env.DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE,
  });

  return {
    read: (input) =>
      readArtifact(input.uri, {
        artifactLabel: 'object-file source',
        uriLabel: 'source.storageUri',
        nodeEnv: env.NODE_ENV,
        s3Client,
        ...(input.signal === undefined ? {} : { abortSignal: input.signal }),
      }),
  };
}
