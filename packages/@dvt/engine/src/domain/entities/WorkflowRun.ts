export type WorkflowRunId = string;

export interface WorkflowRunProps {
  id: WorkflowRunId;
  tenantId: string;
  projectId: string;
}

export class WorkflowRun {
  constructor(private props: WorkflowRunProps) {}

  get id() { return this.props.id; }
}
