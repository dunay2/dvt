/** Owned concern: render command-backed workspace scope selectors inside bounded shell context. */
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { topAppBarClasses } from './chrome';

export type ShellWorkspaceSelectorsProps = {
  readonly workspaceBootstrap: WorkspaceBootstrapConfig;
  readonly selectedTenant: string;
  readonly selectedProject: string;
  readonly selectedEnvironment: string;
  readonly setSelectedTenant: (tenantId: string) => void;
  readonly setSelectedProject: (projectId: string) => void;
  readonly setSelectedEnvironment: (environmentId: string) => void;
};

export function ShellWorkspaceSelectors({
  workspaceBootstrap,
  selectedTenant,
  selectedProject,
  selectedEnvironment,
  setSelectedTenant,
  setSelectedProject,
  setSelectedEnvironment,
}: ShellWorkspaceSelectorsProps) {
  return (
    <div data-slot="shell-workspace-selectors" className="grid gap-3">
      <Select value={selectedTenant} onValueChange={setSelectedTenant}>
        <div className="grid gap-1">
          <span className={topAppBarClasses.selectorLabel}>Tenant</span>
          <SelectTrigger
            aria-label="Tenant scope"
            className={`w-full ${topAppBarClasses.selectTrigger}`}
          >
            <SelectValue />
          </SelectTrigger>
        </div>
        <SelectContent>
          {workspaceBootstrap.tenantOptions.map((tenantOption) => (
            <SelectItem key={tenantOption.value} value={tenantOption.value}>
              {tenantOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedProject} onValueChange={setSelectedProject}>
        <div className="grid gap-1">
          <span className={topAppBarClasses.selectorLabel}>Project</span>
          <SelectTrigger
            aria-label="Project scope"
            className={`w-full ${topAppBarClasses.selectTrigger}`}
          >
            <SelectValue />
          </SelectTrigger>
        </div>
        <SelectContent>
          {workspaceBootstrap.projectOptions.map((projectOption) => (
            <SelectItem key={projectOption.value} value={projectOption.value}>
              {projectOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
        <div className="grid gap-1">
          <span className={topAppBarClasses.selectorLabel}>Environment</span>
          <SelectTrigger
            aria-label="Environment scope"
            className={`w-full ${topAppBarClasses.selectTrigger}`}
          >
            <SelectValue />
          </SelectTrigger>
        </div>
        <SelectContent>
          {workspaceBootstrap.environmentOptions.map((environmentOption) => (
            <SelectItem key={environmentOption.value} value={environmentOption.value}>
              {environmentOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
