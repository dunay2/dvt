/** Owned concern: declare the semantic DTO and route-owned contract for Canvas Inspector authoring. */
import type { DbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import type {
  DbtTestAuthoringMetadata,
  DbtTestAuthoringMetadataErrors,
} from './canvasDbtTestAuthoringModel';
import type {
  DvtNodeAuthoringMetadata,
  DvtNodeAuthoringMetadataErrors,
} from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import type {
  ObjectFilePostgresAuthoringDraft,
  ObjectFilePostgresAuthoringErrors,
} from './objectFilePostgresAuthoringModel';
import type {
  HttpJsonArtifactAuthoringDraft,
  HttpJsonArtifactAuthoringErrors,
} from './httpJsonArtifactAuthoringModel';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';
import type { CanvasDraftSession } from './canvasDraftSession';

export type CanvasInspectorNodeDraft = Readonly<{
  name: string;
  description: string;
  tags: readonly string[];
  dbt?: DbtNodeAuthoringMetadata;
  dbtTest?: DbtTestAuthoringMetadata;
  dvt?: DvtNodeAuthoringMetadata;
  semanticAuthoringIssue?: 'invalid_document' | 'unsupported_shape';
  outputNameDrafts?: Readonly<Record<string, string>>;
  objectFilePostgres?: ObjectFilePostgresAuthoringDraft;
  httpJsonArtifact?: HttpJsonArtifactAuthoringDraft;
}>;

export type CanvasInspectorNodeDraftErrors = Readonly<{
  name?: CanvasInspectorNodeDraftErrorCode;
  description?: CanvasInspectorNodeDraftErrorCode;
  tags?: CanvasInspectorNodeDraftErrorCode;
  dbt?: Partial<Record<keyof DbtNodeAuthoringMetadata, CanvasInspectorNodeDraftErrorCode>>;
  dbtTest?: DbtTestAuthoringMetadataErrors;
  dvt?: DvtNodeAuthoringMetadataErrors;
  outputNames?: CanvasInspectorNodeDraftErrorCode;
  objectFilePostgres?: ObjectFilePostgresAuthoringErrors;
  httpJsonArtifact?: HttpJsonArtifactAuthoringErrors;
}>;

export type CanvasInspectorNodeDraftApplyResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'no_changes' }>
  | Readonly<{
      outcome: 'rejected';
      reason: 'node_unavailable' | 'invalid_draft';
      errors?: CanvasInspectorNodeDraftErrors;
    }>;

export type CanvasInspectorAuthoringContract = Readonly<{
  canEditNode: boolean;
  workspaceScope?: WorkspaceScope;
  relationalPredicateSeed?: CanvasRelationalPredicateSeed;
  onClearRelationalPredicateSeed?: () => void;
  onApplyNodeDraft: (draft: CanvasInspectorNodeDraft) => void;
}>;
