/** Owned concern: declare the semantic DTO and route-owned contract for Canvas Inspector authoring. */

export type CanvasInspectorNodeDraft = Readonly<{
  name: string;
  description: string;
}>;

export type CanvasInspectorNodeDraftErrors = Readonly<{
  name?: string;
}>;

export type CanvasInspectorAuthoringContract = Readonly<{
  canEditNode: boolean;
  onApplyNodeDraft: (draft: CanvasInspectorNodeDraft) => void;
}>;
