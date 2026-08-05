import { S3Client } from '@aws-sdk/client-s3';
import {
  S3ContentAddressedArtifactStore,
  type IContentAddressedArtifactStore,
} from '@dvt/artifacts';

import type { Env } from '../plugins/env.js';

export function createTemporalWorkerHttpJsonArtifactStore(
  env: Env
): IContentAddressedArtifactStore {
  const client = new S3Client({
    ...(env.DVT_OBJECT_FILE_S3_ENDPOINT === undefined
      ? {}
      : { endpoint: env.DVT_OBJECT_FILE_S3_ENDPOINT }),
    ...(env.DVT_OBJECT_FILE_S3_REGION === undefined
      ? {}
      : { region: env.DVT_OBJECT_FILE_S3_REGION }),
    forcePathStyle: env.DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE,
  });
  return new S3ContentAddressedArtifactStore({ client });
}
