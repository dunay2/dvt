import type { GenericGraphSourceV1 } from '@dvt/contracts';

import type { StartRunManifestRef } from './startRunCommandContract.js';

export interface IPlannerCompatibilityResolver {
  resolveManifestRef(ref: StartRunManifestRef): Promise<GenericGraphSourceV1>;
}
