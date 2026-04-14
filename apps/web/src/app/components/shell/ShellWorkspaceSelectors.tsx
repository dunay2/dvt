import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { topAppBarClasses } from './chrome';

type ShellWorkspaceSelectorsProps = {
  readonly workspaceBootstrap: WorkspaceBootstrapConfig;
  readonly selectedTenant: string;
  readonly selectedProject: string;
  readonly setSelectedTenant: (tenantId: string) => void;
  readonly setSelectedProject: (projectId: string) => void;
};

export function ShellWorkspaceSelectors({
  workspaceBootstrap,
  selectedTenant,
  selectedProject,
  setSelectedTenant,
  setSelectedProject,
}: ShellWorkspaceSelectorsProps) {
  return (
    <div data-slot="shell-workspace-selectors" className="contents">
      <Select value={selectedTenant} onValueChange={setSelectedTenant}>
        <SelectTrigger className={`w-[138px] ${topAppBarClasses.selectTrigger}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workspaceBootstrap.tenantOptions.map((tenantOption) => (
            <SelectItem key={tenantOption.value} value={tenantOption.value}>
              {tenantOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedProject} onValueChange={setSelectedProject}>
        <SelectTrigger className={`w-[160px] ${topAppBarClasses.selectTrigger}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workspaceBootstrap.projectOptions.map((projectOption) => (
            <SelectItem key={projectOption.value} value={projectOption.value}>
              {projectOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
