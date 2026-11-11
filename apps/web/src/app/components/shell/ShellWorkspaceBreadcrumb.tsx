/**
 * Owned concern: display the active workspace path in the persistent shell header.
 * @baseline GH-3765: identity is visible; operational properties remain in the rail.
 * @decision Reuse breadcrumb primitives and the shared workspace identity query.
 * @consequence Scope labels have no fake navigation links or mutation handlers.
 * @version 1.0.0
 */
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb';
import type { ShellTopBarCopy } from './copy';
import styles from './ShellChrome.module.css';
import { useShellProjectIdentity } from './useShellProjectIdentity';

export function ShellWorkspaceBreadcrumb({ copy }: Readonly<{ copy: ShellTopBarCopy }>) {
  const { badge } = useShellProjectIdentity();

  return (
    <Breadcrumb
      data-slot="shell-workspace-breadcrumb"
      aria-label={copy.workspaceContext}
      className={styles.workspaceBreadcrumb}
    >
      <BreadcrumbList className={styles.workspacePath}>
        <BreadcrumbItem className={styles.workspaceSegment}>
          <span
            data-slot="shell-workspace-tenant-context"
            title={`${copy.tenantScope}: ${badge.tenantLabel}`}
            className={styles.workspaceSegmentLabel}
          >
            {badge.tenantLabel}
          </span>
        </BreadcrumbItem>
        <BreadcrumbSeparator className={styles.workspaceSeparator}>/</BreadcrumbSeparator>
        <BreadcrumbItem className={styles.workspaceSegment}>
          <span
            data-slot="shell-workspace-project-context"
            title={`${copy.projectScope}: ${badge.projectLabel}`}
            className={styles.workspaceProjectLabel}
          >
            {badge.projectLabel}
          </span>
        </BreadcrumbItem>
        <BreadcrumbSeparator className={styles.workspaceSeparator}>/</BreadcrumbSeparator>
        <BreadcrumbItem className={styles.workspaceSegment}>
          <span
            data-slot="shell-workspace-environment-context"
            title={`${copy.environmentScope}: ${badge.environmentLabel}`}
            aria-current="location"
            className={styles.workspaceSegmentLabel}
          >
            {badge.environmentLabel}
          </span>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
