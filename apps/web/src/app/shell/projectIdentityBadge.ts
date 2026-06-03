/** Owned concern: project workspace session scope into read-only shell identity labels. */
import type { WorkspaceBootstrapConfig } from '../services/config/workspaceConfig';

type WorkspaceOption = WorkspaceBootstrapConfig['tenantOptions'][number];

export type ProjectIdentityBadgeInput = Readonly<{
  workspaceBootstrap: WorkspaceBootstrapConfig;
  selectedTenant: string;
  selectedProject: string;
  selectedEnvironment: string;
}>;

export type ProjectIdentityBadge = Readonly<{
  tenantId: string;
  tenantLabel: string;
  projectId: string;
  projectLabel: string;
  environmentId: string;
  environmentLabel: string;
  compactProjectId: string;
  slug: string;
  draftPostureLabel: string;
}>;

function resolveWorkspaceOptionLabel(
  options: readonly WorkspaceOption[],
  value: string,
  fallback: string
): string {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

export function buildProjectIdentityBadge({
  workspaceBootstrap,
  selectedTenant,
  selectedProject,
  selectedEnvironment,
}: ProjectIdentityBadgeInput): ProjectIdentityBadge {
  const tenantLabel = resolveWorkspaceOptionLabel(
    workspaceBootstrap.tenantOptions,
    selectedTenant,
    selectedTenant
  );
  const projectLabel = resolveWorkspaceOptionLabel(
    workspaceBootstrap.projectOptions,
    selectedProject,
    selectedProject
  );
  const environmentLabel = resolveWorkspaceOptionLabel(
    workspaceBootstrap.environmentOptions,
    selectedEnvironment,
    selectedEnvironment
  );

  return {
    tenantId: selectedTenant,
    tenantLabel,
    projectId: selectedProject,
    projectLabel,
    environmentId: selectedEnvironment,
    environmentLabel,
    compactProjectId: selectedProject,
    slug: `${tenantLabel} / ${projectLabel}`,
    draftPostureLabel: 'Draft scope',
  };
}
