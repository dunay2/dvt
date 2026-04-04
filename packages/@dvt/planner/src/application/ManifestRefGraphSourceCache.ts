import type { IArtifactResolver } from '../ports/IArtifactResolver.js';

type DbtManifestRef = import('@dvt/contracts').DbtManifestRef;
type GenericGraphSourceV1 = import('@dvt/contracts').GenericGraphSourceV1SchemaT;

export class ManifestRefGraphSourceCache {
  private readonly cache = new Map<string, GenericGraphSourceV1>();

  constructor(
    private readonly resolver: IArtifactResolver,
    private readonly cacheSize: number,
    private readonly validateGraphSource: (graphSource: unknown) => GenericGraphSourceV1
  ) {}

  async resolve(ref: DbtManifestRef): Promise<GenericGraphSourceV1> {
    if (this.cacheSize === 0) {
      return this.validateGraphSource(await this.resolver.resolveGraphSource(ref));
    }

    const cacheKey = `${ref.sha256}:${ref.uri}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return cached;
    }

    const resolved = this.validateGraphSource(await this.resolver.resolveGraphSource(ref));
    if (this.cache.size >= this.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (typeof oldestKey === 'string') this.cache.delete(oldestKey);
    }
    this.cache.set(cacheKey, resolved);
    return resolved;
  }
}
