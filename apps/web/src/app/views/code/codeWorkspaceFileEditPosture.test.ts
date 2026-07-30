import { describe, expect, it } from 'vitest';

import { resolveCodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';

describe('Code workspace file edit posture', () => {
  const graphOwnedPaths = new Set(['dbt_project.yml', 'models/orders.sql', 'models/schema.yml']);

  it('makes graph-owned generated files read-only', () => {
    expect(
      resolveCodeWorkspaceFileEditPosture({
        authority: 'graph-draft',
        selectedPath: 'models/orders.sql',
        graphOwnedPaths,
      })
    ).toEqual({ kind: 'graph_owned_read_only' });
  });

  it('keeps file-authoritative DBT projects editable', () => {
    expect(
      resolveCodeWorkspaceFileEditPosture({
        authority: 'dbt-project-files',
        selectedPath: 'models/orders.sql',
        graphOwnedPaths,
      })
    ).toEqual({ kind: 'editable' });
  });

  it('does not claim unrelated fallback files as graph-owned', () => {
    expect(
      resolveCodeWorkspaceFileEditPosture({
        authority: 'graph-draft',
        selectedPath: 'README.md',
        graphOwnedPaths,
      })
    ).toEqual({ kind: 'editable' });
  });
});
