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

export type CanvasInspectorNodeDraft = Readonly<{
  name: string;
  description: string;
  tags: readonly string[];
  dbt?: DbtNodeAuthoringMetadata;
  dbtTest?: DbtTestAuthoringMetadata;
  dvt?: DvtNodeAuthoringMetadata;
  objectFilePostgres?: ObjectFilePostgresAuthoringDraft;
  httpJsonArtifact?: HttpJsonArtifactAuthoringDraft;
}>;

export type CanvasInspectorNodeDraftErrors = Readonly<{
  name?: CanvasInspectorNodeDraftErrorCode;
  dbt?: Partial<Record<keyof DbtNodeAuthoringMetadata, CanvasInspectorNodeDraftErrorCode>>;
  dbtTest?: DbtTestAuthoringMetadataErrors;
  dvt?: DvtNodeAuthoringMetadataErrors;
  objectFilePostgres?: ObjectFilePostgresAuthoringErrors;
  httpJsonArtifact?: HttpJsonArtifactAuthoringErrors;
}>;

export type CanvasNodeDraftAuthoringPort = Readonly<{
  apply: (draft: CanvasInspectorNodeDraft) => void;
}>;

export type CanvasInspectorAuthoringContract = Readonly<{
  nodeDraftAuthoring: CanvasNodeDraftAuthoringPort | null;
}>;
