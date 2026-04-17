import type { Logger } from 'pino';

import type { IWorkspaceGraphDraftAuditPort } from '../../application/ports/workspaceGraphDraft.js';

export class StructuredWorkspaceGraphDraftAuditLogger implements IWorkspaceGraphDraftAuditPort {
  public constructor(private readonly logger: Logger) {}

  public async record(input: Parameters<IWorkspaceGraphDraftAuditPort['record']>[0]): Promise<void> {
    const entry = {
      audit: true,
      eventType: 'WORKSPACE_GRAPH_DRAFT_DECISION',
      action: input.action,
      outcome: input.outcome,
      requestId: input.decision.requestId,
      correlationId: input.decision.correlationId,
      decisionId: input.decision.decisionId,
      recordedAt: input.decision.recordedAt,
      tenantId: input.decision.scope.tenantId,
      projectId: input.decision.scope.projectId,
      environmentId: input.decision.scope.environmentId,
      capabilityMode: input.decision.capability.mode,
      capabilityReason: input.decision.capability.reason,
      principalId: input.decision.principal?.principalId,
      principalType: input.decision.principal?.principalType,
      authentication: input.decision.authentication,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    };

    if (input.outcome === 'forbidden' || input.outcome === 'conflict') {
      this.logger.warn(entry, 'workspace_graph_draft.decision');
      return;
    }

    this.logger.info(entry, 'workspace_graph_draft.decision');
  }
}
