import type {
  ICompiledCodeCache,
  ICompiledCodeReader,
  ICompiledCodeRetryPolicy,
} from '@dvt/traceability-service';

import type { Env } from '../env.js';

export type CompiledCodeResolverBackend = 'auto' | 'file' | 's3';

export type CompiledCodeResolverEnv = Pick<
  Env,
  | 'NODE_ENV'
  | 'DVT_COMPILED_CODE_RESOLVER_BACKEND'
  | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
  | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
  | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
>;

export type S3ResolverEnv = Pick<
  Env,
  | 'DVT_COMPILED_CODE_RESOLVER_S3_ENDPOINT'
  | 'DVT_COMPILED_CODE_RESOLVER_S3_REGION'
  | 'DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE'
>;

export interface CompiledCodeResolverOptions {
  backend?: CompiledCodeResolverBackend;
  cache?: ICompiledCodeCache;
  readerOverrides?: ReadonlyMap<string, ICompiledCodeReader>;
  retryPolicy?: Partial<ICompiledCodeRetryPolicy>;
}
