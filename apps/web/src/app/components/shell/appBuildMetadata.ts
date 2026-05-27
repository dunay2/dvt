/** Owned concern: resolve compile-time Raven bundle metadata for shell presentation. */
type AppBuildMetadataEnv = Partial<
  Readonly<{
    VITE_APP_VERSION?: string;
    VITE_APP_BUILD_DATE?: string;
  }>
>;

export type CompiledApplicationMetadata = Readonly<{
  productName: 'Raven';
  version: string;
  buildDate: string | null;
}>;

function readNonBlankBuildValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function resolveCompiledApplicationMetadata(
  env: AppBuildMetadataEnv = import.meta.env as AppBuildMetadataEnv
): CompiledApplicationMetadata {
  return {
    productName: 'Raven',
    version: readNonBlankBuildValue(env.VITE_APP_VERSION) ?? '0.0.0',
    buildDate: readNonBlankBuildValue(env.VITE_APP_BUILD_DATE),
  };
}
