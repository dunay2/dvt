import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import { topAppBarClasses } from './styles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type TopAppBarWorkspaceSelectorsProps = {
  readonly workspaceBootstrap: WorkspaceBootstrapConfig;
  readonly selectedTenant: string;
  readonly selectedProject: string;
  readonly selectedEnvironment: string;
  readonly setSelectedTenant: (tenantId: string) => void;
  readonly setSelectedProject: (projectId: string) => void;
  readonly setSelectedEnvironment: (environmentId: string) => void;
};

export function TopAppBarWorkspaceSelectors({
  workspaceBootstrap,
  selectedTenant,
  selectedProject,
  selectedEnvironment,
  setSelectedTenant,
  setSelectedProject,
  setSelectedEnvironment,
}: TopAppBarWorkspaceSelectorsProps) {
  return (
    <>
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

      <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
        <SelectTrigger className={`w-[104px] ${topAppBarClasses.selectTrigger}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workspaceBootstrap.environmentOptions.map((environmentOption) => (
            <SelectItem key={environmentOption.value} value={environmentOption.value}>
              {environmentOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
