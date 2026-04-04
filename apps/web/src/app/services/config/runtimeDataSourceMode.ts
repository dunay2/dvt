import { resolveDataSource, type DataSourceMode } from './dataSource';

let runtimeDataSourceMode: DataSourceMode = resolveDataSource();

export function getRuntimeDataSourceMode(): DataSourceMode {
  return runtimeDataSourceMode;
}

export function setRuntimeDataSourceMode(mode: DataSourceMode): void {
  runtimeDataSourceMode = mode;
}
