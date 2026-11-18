/**
 * Owned concern: define the response for a page of direct workspace files.
 * @baseline ADR-0062: Server-owned granted workspace context and default
 * @decision Expose project-relative paths and an opaque continuation bound to the granted workspace.
 * @consequence Consumers can resume a bounded listing within the same directory and scope.
 * @version 1.0.0
 */
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
