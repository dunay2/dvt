/** Owned concern: expose only the public, read-only relocation plan. */
import type { DbtProjectRootRelocationPreview } from '@dvt/contracts';

import type { WorkspaceStorageScope } from '../../ports/workspaceFiles.js';

import {
  inspectDbtProjectRootRelocation,
  type RootRelocationPlanningDependencies,
} from './relocationPlan.js';

export class PreviewDbtProjectRootRelocationQuery {
  public constructor(private readonly deps: RootRelocationPlanningDependencies) {}
  public async execute(
    input: Readonly<{ scope: WorkspaceStorageScope; canvasId: string }>
  ): Promise<DbtProjectRootRelocationPreview> {
    return (await inspectDbtProjectRootRelocation(this.deps, input)).preview;
  }
}
