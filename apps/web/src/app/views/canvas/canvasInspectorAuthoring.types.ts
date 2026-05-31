/** Owned concern: declare the semantic DTO and route-owned contract for Canvas Inspector authoring. */
import type { DbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import type {
  DvtNodeAuthoringMetadata,
  DvtNodeAuthoringMetadataErrors,
} from './canvasDvtAuthoringModel';

export type CanvasInspectorNodeDraft = Readonly<{
  name: string;
  description: string;
  dbt?: DbtNodeAuthoringMetadata;
  dvt?: DvtNodeAuthoringMetadata;
}>;

export type CanvasInspectorNodeDraftErrors = Readonly<{
  name?: string;
  dbt?: Partial<Record<keyof DbtNodeAuthoringMetadata, string>>;
  dvt?: DvtNodeAuthoringMetadataErrors;
}>;

export type CanvasInspectorAuthoringContract = Readonly<{
  canEditNode: boolean;
  onApplyNodeDraft: (draft: CanvasInspectorNodeDraft) => void;
}>;
