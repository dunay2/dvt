/**
 * @ownedConcern Adapt governed artifact URIs to the object-file plugin reader port.
 */
import { readArtifact } from '@dvt/artifacts';
import type { ContentAddressedObjectReader } from '@dvt/temporal-object-file-postgres-plugin';

import type { Env } from '../plugins/env.js';

export function createTemporalWorkerObjectFileReader(env: Env): ContentAddressedObjectReader {
  return {
    read: (input) =>
      readArtifact(input.uri, {
        artifactLabel: 'object-file source',
        uriLabel: 'source.storageUri',
        nodeEnv: env.NODE_ENV,
        ...(input.signal === undefined ? {} : { abortSignal: input.signal }),
      }),
  };
}
