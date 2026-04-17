import { z } from 'zod';

export {
  WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION,
  WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON,
  WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON,
  WORKSPACE_GRAPH_DRAFT_MIGRATION_STATE,
  WorkspaceGraphDraftAuditRefSchema,
  WorkspaceGraphDraftCapabilityOutcomeSchema,
  WorkspaceGraphDraftFormatErrorSchema,
  WorkspaceGraphDraftFormatMetaSchema,
  WorkspaceGraphDraftReadDeniedSchema,
  WorkspaceGraphDraftReadFormatFailureSchema,
  WorkspaceGraphDraftReadResponseSchema,
  WorkspaceGraphDraftReadSuccessSchema,
  WorkspaceGraphDraftRecordSchema,
  WorkspaceGraphDraftSaveConflictSchema,
  WorkspaceGraphDraftSaveDeniedSchema,
  WorkspaceGraphDraftSaveRequestSchema,
  WorkspaceGraphDraftSaveResponseSchema,
  WorkspaceGraphDraftSaveSuccessSchema,
  WorkspaceGraphDraftScopeSchema,
} from '../contracts/planner/WorkspaceGraphDraft.v1.js';

import {
  WorkspaceGraphDraftAuditRefSchema,
  WorkspaceGraphDraftCapabilityOutcomeSchema,
  WorkspaceGraphDraftFormatErrorSchema,
  WorkspaceGraphDraftFormatMetaSchema,
  WorkspaceGraphDraftReadResponseSchema,
  WorkspaceGraphDraftRecordSchema,
  WorkspaceGraphDraftSaveRequestSchema,
  WorkspaceGraphDraftSaveResponseSchema,
  WorkspaceGraphDraftScopeSchema,
} from '../contracts/planner/WorkspaceGraphDraft.v1.js';

export type WorkspaceGraphDraftScopeSchemaT = z.infer<typeof WorkspaceGraphDraftScopeSchema>;
export type WorkspaceGraphDraftCapabilityOutcomeSchemaT = z.infer<
  typeof WorkspaceGraphDraftCapabilityOutcomeSchema
>;
export type WorkspaceGraphDraftAuditRefSchemaT = z.infer<typeof WorkspaceGraphDraftAuditRefSchema>;
export type WorkspaceGraphDraftFormatMetaSchemaT = z.infer<
  typeof WorkspaceGraphDraftFormatMetaSchema
>;
export type WorkspaceGraphDraftFormatErrorSchemaT = z.infer<
  typeof WorkspaceGraphDraftFormatErrorSchema
>;
export type WorkspaceGraphDraftRecordSchemaT = z.infer<typeof WorkspaceGraphDraftRecordSchema>;
export type WorkspaceGraphDraftReadResponseSchemaT = z.infer<
  typeof WorkspaceGraphDraftReadResponseSchema
>;
export type WorkspaceGraphDraftSaveRequestSchemaT = z.infer<
  typeof WorkspaceGraphDraftSaveRequestSchema
>;
export type WorkspaceGraphDraftSaveResponseSchemaT = z.infer<
  typeof WorkspaceGraphDraftSaveResponseSchema
>;
