import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import { vi, type Mock } from 'vitest';

import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';

export function publisherHarness(): {
  publish: Mock<IContentAddressedArtifactStore['publish']>;
  publisher: DvtPostgresTargetProjectionPublisher;
} {
  const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>(
    async (request) => ({ ...request, disposition: 'created' })
  );
  return {
    publish,
    publisher: new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `memory://occurrence-test/${sha256}`,
    }),
  };
}
