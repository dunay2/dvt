/** A bounded list of direct workspace files uses their project-relative paths and an opaque continuation. */
import { z } from 'zod';

export const WORKSPACE_DIRECTORY_PAGE_SIZE = 100;
export type WorkspaceDirectoryRequest = Readonly<{ directory: string; cursor?: string | null }>;
export const WorkspaceDirectoryPageSchema = z
  .object({
    entries: z.array(z.string().min(1)).max(WORKSPACE_DIRECTORY_PAGE_SIZE),
    nextCursor: z.string().min(1).nullable(),
  })
  .strict();
export type WorkspaceDirectoryPage = z.infer<typeof WorkspaceDirectoryPageSchema>;
