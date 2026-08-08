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
import type {
  PythonCodeAuthoringDraft,
  PythonCodeAuthoringErrors,
} from './pythonCodeAuthoringModel';

export type CanvasInspectorNodeDraft = Readonly<{
  name: string;
  description: string;
  tags: readonly string[];
  dbt?: DbtNodeAuthoringMetadata;
  dbtTest?: DbtTestAuthoringMetadata;
  dvt?: DvtNodeAuthoringMetadata;
  objectFilePostgres?: ObjectFilePostgresAuthoringDraft;
  httpJsonArtifact?: HttpJsonArtifactAuthoringDraft;
  pythonCode?: PythonCodeAuthoringDraft;
}>;

export type CanvasInspectorNodeDraftErrors = Readonly<{
  name?: CanvasInspectorNodeDraftErrorCode;
  dbt?: Partial<Record<keyof DbtNodeAuthoringMetadata, CanvasInspectorNodeDraftErrorCode>>;
  dbtTest?: DbtTestAuthoringMetadataErrors;
  dvt?: DvtNodeAuthoringMetadataErrors;
  objectFilePostgres?: ObjectFilePostgresAuthoringErrors;
  httpJsonArtifact?: HttpJsonArtifactAuthoringErrors;
  pythonCode?: PythonCodeAuthoringErrors;
}>;

export type CanvasInspectorNodeModelerActions = Readonly<{
  selectedForExecution: boolean;
  onDuplicateNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
  onRemoveNode?: (nodeId: string) => void;
}>;

export type CanvasInspectorAuthoringContract = Readonly<{
  canEditNode: boolean;
  onApplyNodeDraft: (draft: CanvasInspectorNodeDraft) => void;
  modelerActions?: CanvasInspectorNodeModelerActions;
}>;
