import type { DataSourceMode } from './dataSource';
import { getRuntimeDataSourceMode } from './runtimeDataSourceMode';

type WorkspaceOption = {
  value: string;
  label: string;
};

export type WorkspaceBootstrapConfig = {
  tenantId: string;
  projectId: string;
  environmentId: string;
  gitBranch: string;
  gitSha: string;
  tenantOptions: WorkspaceOption[];
  projectOptions: WorkspaceOption[];
  environmentOptions: WorkspaceOption[];
};

const MOCK_WORKSPACE_EXAMPLE: WorkspaceBootstrapConfig = {
  tenantId: 'acme-corp',
  projectId: 'dbt-analytics',
  environmentId: 'dev',
  gitBranch: 'main',
  gitSha: 'local',
  tenantOptions: [
    { value: 'acme-corp', label: 'ACME Corp' },
    { value: 'globex', label: 'Globex Inc' },
    { value: 'initech', label: 'Initech' },
  ],
  projectOptions: [
    { value: 'dbt-analytics', label: 'dbt-analytics' },
    { value: 'dbt-marketing', label: 'dbt-marketing' },
    { value: 'dbt-finance', label: 'dbt-finance' },
  ],
  environmentOptions: [
    { value: 'dev', label: 'dev' },
    { value: 'stage', label: 'stage' },
    { value: 'prod', label: 'prod' },
  ],
};

const GENERIC_WORKSPACE_DEFAULT: WorkspaceBootstrapConfig = {
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'dev',
  gitBranch: 'detached',
  gitSha: 'unknown',
  tenantOptions: [{ value: 'tenant', label: 'tenant' }],
  projectOptions: [{ value: 'project', label: 'project' }],
  environmentOptions: [{ value: 'dev', label: 'dev' }],
};

function readOptionalEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function dedupeOptions(options: WorkspaceOption[]): WorkspaceOption[] {
  const seen = new Set<string>();
  const deduped: WorkspaceOption[] = [];
  for (const option of options) {
    const normalized = option.value.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push({ value: normalized, label: option.label.trim() || normalized });
  }
  return deduped;
}

function parseOptionList(value: unknown): WorkspaceOption[] {
  if (typeof value !== 'string') {
    return [];
  }
  const parsed = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [rawValueCandidate, rawLabelCandidate] = entry.split('|');
      const rawValue = rawValueCandidate?.trim() ?? '';
      const rawLabel = rawLabelCandidate?.trim();
      return {
        value: rawValue,
        label: rawLabel || rawValue,
      };
    });

  return dedupeOptions(parsed);
}

function ensureOptionValue(options: WorkspaceOption[], value: string): WorkspaceOption[] {
  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return options;
  }
  const exists = options.some((option) => option.value === normalizedValue);
  if (exists) {
    return options;
  }
  return [{ value: normalizedValue, label: normalizedValue }, ...options];
}

function resolveBaseWorkspaceConfig(mode: DataSourceMode): WorkspaceBootstrapConfig {
  return mode === 'mock' ? MOCK_WORKSPACE_EXAMPLE : GENERIC_WORKSPACE_DEFAULT;
}

export function resolveWorkspaceBootstrapConfig(
  mode: DataSourceMode = getRuntimeDataSourceMode()
): WorkspaceBootstrapConfig {
  const base = resolveBaseWorkspaceConfig(mode);

  const tenantId = readOptionalEnv(import.meta.env.VITE_DEFAULT_TENANT_ID) ?? base.tenantId;
  const projectId = readOptionalEnv(import.meta.env.VITE_DEFAULT_PROJECT_ID) ?? base.projectId;
  const environmentId =
    readOptionalEnv(import.meta.env.VITE_DEFAULT_ENVIRONMENT_ID) ?? base.environmentId;
  const gitBranch = readOptionalEnv(import.meta.env.VITE_GIT_BRANCH) ?? base.gitBranch;
  const gitSha = readOptionalEnv(import.meta.env.VITE_GIT_SHA) ?? base.gitSha;

  const tenantOptionsFromEnv = parseOptionList(import.meta.env.VITE_TENANT_OPTIONS);
  const projectOptionsFromEnv = parseOptionList(import.meta.env.VITE_PROJECT_OPTIONS);
  const environmentOptionsFromEnv = parseOptionList(import.meta.env.VITE_ENVIRONMENT_OPTIONS);

  const tenantOptions = ensureOptionValue(
    tenantOptionsFromEnv.length > 0 ? tenantOptionsFromEnv : base.tenantOptions,
    tenantId
  );

  const projectOptions = ensureOptionValue(
    projectOptionsFromEnv.length > 0 ? projectOptionsFromEnv : base.projectOptions,
    projectId
  );

  const environmentOptions = ensureOptionValue(
    environmentOptionsFromEnv.length > 0 ? environmentOptionsFromEnv : base.environmentOptions,
    environmentId
  );

  return {
    tenantId,
    projectId,
    environmentId,
    gitBranch,
    gitSha,
    tenantOptions: dedupeOptions(tenantOptions),
    projectOptions: dedupeOptions(projectOptions),
    environmentOptions: dedupeOptions(environmentOptions),
  };
}
