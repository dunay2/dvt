/** Owned concern: manage project-canvas worksheet identity inside the protected draft aggregate. */
import type {
  WorkspaceGraphAuthoringCanvasDocument,
  WorkspaceGraphAuthoringCanvasWorkspace,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';

export type ProjectCanvasDocument = WorkspaceGraphAuthoringCanvasDocument & { id: string };

export type ProjectCanvasPatch = Readonly<{
  title?: string;
  environmentId?: string | undefined;
  defaultPermission?: WorkspaceGraphAuthoringCanvasDocument['defaultPermission'];
}>;

function slugifyCanvasIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createCanvasIdBase(canvas: Pick<WorkspaceGraphAuthoringCanvasDocument, 'kind' | 'title'>) {
  return (
    slugifyCanvasIdPart(canvas.title) || `${slugifyCanvasIdPart(canvas.kind) || 'canvas'}-canvas`
  );
}

export function createProjectCanvasId(args: {
  canvas: Pick<WorkspaceGraphAuthoringCanvasDocument, 'kind' | 'title'>;
  existingIds: ReadonlySet<string>;
}): string {
  const base = createCanvasIdBase(args.canvas);
  if (!args.existingIds.has(base)) {
    return base;
  }

  let suffix = 2;
  while (args.existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function toProjectCanvasDocument(
  canvas: WorkspaceGraphAuthoringCanvasDocument,
  existingIds: ReadonlySet<string>
): ProjectCanvasDocument {
  return {
    ...canvas,
    id: canvas.id ?? createProjectCanvasId({ canvas, existingIds }),
  };
}

function cloneGraphWorkspace(
  draft: WorkspaceGraphAuthoringDraft,
  canvas: ProjectCanvasDocument
): WorkspaceGraphAuthoringCanvasWorkspace {
  return {
    canvas,
    nodeIds: [...draft.nodeIds],
    nodePositions: { ...draft.nodePositions },
    nodes: draft.nodes.map((node) => ({ ...node })),
    edges: draft.edges.map((edge) => ({ ...edge })),
  };
}

function workspaceToDraft(
  workspace: WorkspaceGraphAuthoringCanvasWorkspace,
  canvases: WorkspaceGraphAuthoringCanvasWorkspace[]
): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { ...workspace.canvas },
    activeCanvasId: workspace.canvas.id,
    canvases,
    nodeIds: [...workspace.nodeIds],
    nodePositions: { ...workspace.nodePositions },
    nodes: workspace.nodes.map((node) => ({ ...node })),
    edges: workspace.edges.map((edge) => ({ ...edge })),
  };
}

function createEmptyProjectCanvasWorkspace(
  command: CanvasCreateCanvasDocumentCommand,
  existingIds: ReadonlySet<string>
): WorkspaceGraphAuthoringCanvasWorkspace {
  const canvas: ProjectCanvasDocument = {
    id: createProjectCanvasId({ canvas: command, existingIds }),
    kind: command.kind,
    title: command.title,
  };

  return {
    canvas,
    nodeIds: [],
    nodePositions: {},
    nodes: [],
    edges: [],
  };
}

export function buildInitialProjectCanvasDraft(
  command: CanvasCreateCanvasDocumentCommand
): WorkspaceGraphAuthoringDraft {
  const workspace = createEmptyProjectCanvasWorkspace(command, new Set());
  return workspaceToDraft(workspace, [workspace]);
}

export function normalizeProjectCanvasDraft(
  draft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphAuthoringDraft {
  const incomingCanvases = draft.canvases ?? [];
  const existingIds = new Set(incomingCanvases.map((workspace) => workspace.canvas.id));
  const activeCanvas = toProjectCanvasDocument(draft.canvas, existingIds);
  existingIds.add(activeCanvas.id);

  const activeWorkspace = cloneGraphWorkspace(draft, activeCanvas);
  const activeCanvasId = draft.activeCanvasId ?? activeCanvas.id;
  const normalizedCanvases =
    incomingCanvases.length === 0
      ? [activeWorkspace]
      : incomingCanvases.map((workspace) =>
          workspace.canvas.id === activeCanvasId ? activeWorkspace : workspace
        );
  const hasActiveWorkspace = normalizedCanvases.some(
    (workspace) => workspace.canvas.id === activeCanvasId
  );
  const canvases = hasActiveWorkspace
    ? normalizedCanvases
    : [...normalizedCanvases, activeWorkspace];
  const selectedWorkspace =
    canvases.find((workspace) => workspace.canvas.id === activeCanvasId) ?? activeWorkspace;

  return workspaceToDraft(selectedWorkspace, canvases);
}

export function preserveProjectCanvasWorkspaces(args: {
  currentDraft: WorkspaceGraphAuthoringDraft;
  baselineDraft: WorkspaceGraphAuthoringDraft | null | undefined;
}): WorkspaceGraphAuthoringDraft {
  const { currentDraft, baselineDraft } = args;
  if (
    baselineDraft?.canvases == null &&
    baselineDraft?.activeCanvasId == null &&
    baselineDraft?.canvas.id == null
  ) {
    return currentDraft;
  }

  return normalizeProjectCanvasDraft({
    ...currentDraft,
    canvas: {
      ...(baselineDraft?.canvas ?? {}),
      ...currentDraft.canvas,
    },
    activeCanvasId: baselineDraft?.activeCanvasId ?? currentDraft.canvas.id,
    canvases: baselineDraft?.canvases,
  });
}

export function listProjectCanvasDocuments(
  draft: WorkspaceGraphAuthoringDraft | null | undefined
): ProjectCanvasDocument[] {
  if (draft == null) {
    return [];
  }

  if (draft.canvases != null && draft.canvases.length > 0) {
    return draft.canvases.map((workspace) => workspace.canvas);
  }

  return [toProjectCanvasDocument(draft.canvas, new Set())];
}

export function resolveActiveProjectCanvasId(
  draft: WorkspaceGraphAuthoringDraft | null | undefined
): string | null {
  if (draft == null) {
    return null;
  }

  return (
    draft.activeCanvasId ?? draft.canvas.id ?? listProjectCanvasDocuments(draft)[0]?.id ?? null
  );
}

export function buildDraftWithCreatedProjectCanvas(args: {
  currentDraft: WorkspaceGraphAuthoringDraft;
  command: CanvasCreateCanvasDocumentCommand;
}): WorkspaceGraphAuthoringDraft {
  const normalizedDraft = normalizeProjectCanvasDraft(args.currentDraft);
  const existingIds = new Set(normalizedDraft.canvases?.map((workspace) => workspace.canvas.id));
  const nextWorkspace = createEmptyProjectCanvasWorkspace(args.command, existingIds);

  return workspaceToDraft(nextWorkspace, [...(normalizedDraft.canvases ?? []), nextWorkspace]);
}

export function buildDraftWithSelectedProjectCanvas(args: {
  currentDraft: WorkspaceGraphAuthoringDraft;
  canvasId: string;
}): WorkspaceGraphAuthoringDraft | null {
  const normalizedDraft = normalizeProjectCanvasDraft(args.currentDraft);
  const targetWorkspace = normalizedDraft.canvases?.find(
    (workspace) => workspace.canvas.id === args.canvasId
  );

  return targetWorkspace == null
    ? null
    : workspaceToDraft(targetWorkspace, normalizedDraft.canvases ?? []);
}

export function buildDraftWithUpdatedActiveProjectCanvas(args: {
  currentDraft: WorkspaceGraphAuthoringDraft;
  patch: ProjectCanvasPatch;
}): WorkspaceGraphAuthoringDraft | null {
  const normalizedDraft = normalizeProjectCanvasDraft(args.currentDraft);
  const activeCanvasId = normalizedDraft.activeCanvasId;
  if (activeCanvasId == null) {
    return null;
  }

  const title = args.patch.title?.trim();
  if (args.patch.title != null && !title) {
    return null;
  }

  const canvases = (normalizedDraft.canvases ?? []).map((workspace) => {
    if (workspace.canvas.id !== activeCanvasId) {
      return workspace;
    }

    return {
      ...workspace,
      canvas: {
        ...workspace.canvas,
        ...(title == null ? {} : { title }),
        ...(args.patch.environmentId === undefined
          ? {}
          : { environmentId: args.patch.environmentId }),
        ...(args.patch.defaultPermission === undefined
          ? {}
          : { defaultPermission: args.patch.defaultPermission }),
      },
    };
  });
  const activeWorkspace = canvases.find((workspace) => workspace.canvas.id === activeCanvasId);

  return activeWorkspace == null ? null : workspaceToDraft(activeWorkspace, canvases);
}

export function buildDraftWithDeletedActiveProjectCanvas(
  currentDraft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphAuthoringDraft | null {
  const normalizedDraft = normalizeProjectCanvasDraft(currentDraft);
  const canvases = normalizedDraft.canvases ?? [];
  const activeIndex = canvases.findIndex(
    (workspace) => workspace.canvas.id === normalizedDraft.activeCanvasId
  );

  if (activeIndex < 0 || canvases.length <= 1) {
    return null;
  }

  const remainingCanvases = canvases.filter((_, index) => index !== activeIndex);
  const fallbackIndex = Math.max(0, activeIndex - 1);
  const fallbackWorkspace = remainingCanvases[fallbackIndex] ?? remainingCanvases[0];

  return fallbackWorkspace == null ? null : workspaceToDraft(fallbackWorkspace, remainingCanvases);
}
