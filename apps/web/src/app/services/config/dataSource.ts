const DATA_SOURCE_VALUES = ['mock', 'api'] as const;

export type DataSourceMode = (typeof DATA_SOURCE_VALUES)[number];

const DATA_SOURCE_SET = new Set<string>(DATA_SOURCE_VALUES);

export function resolveDataSource(value = import.meta.env.VITE_DATA_SOURCE): DataSourceMode {
  if (typeof value !== 'string') {
    return 'api';
  }

  const normalized = value.trim().toLowerCase();
  if (DATA_SOURCE_SET.has(normalized)) {
    return normalized as DataSourceMode;
  }

  return 'api';
}
