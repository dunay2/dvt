// @vitest-environment jsdom
/** Project variation edits must retain the loaded revision on conflict and allow a safe copy. */
import { sha256HexUtf8 } from '@dvt/crypto';
import { fireEvent, within } from '@testing-library/dom';
import { act } from 'react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { withTestQueryClient, waitForReactQuery } from '../../testing/reactQueryHarness';
import { createMockSessionContextPort } from '../../testing/runsPortDoubles';
import type { IWorkspaceFileContentCommandPort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { WorkspaceFileRevisionConflictError } from '../services/workspace/workspaceErrors';
import TemplatesView from './TemplatesView';
import { encodeProjectTemplate } from './templates/projectTemplateFile';

it('restores each recipe draft and removes the generated SQL when a required value is cleared', async () => {
  const mounted = await withTestQueryClient(
    <AppServicesProvider overrides={createAppServicesTestOverrides()}>
      <MemoryRouter>
        <TemplatesView />
      </MemoryRouter>
    </AppServicesProvider>
  );
  const ui = within(mounted.container);
  const field = (name: string): HTMLElement => ui.getByRole('textbox', { name });
  const change = async (name: string, value: string): Promise<void> => {
    await act(async () => {
      fireEvent.change(field(name), { target: { value } });
    });
  };
  const select = async (name: RegExp): Promise<void> => {
    await act(async () => {
      fireEvent.click(ui.getByRole('button', { name }));
    });
  };
  const generated = (): Element | null =>
    mounted.container.querySelector('[data-slot="templates-generated-source-readable-preview"]');
  try {
    await change('Task name', 'retained_task');
    await change('Warehouse', 'retained_wh');
    expect(generated()?.textContent).toContain('create or replace task retained_task');
    await select(/^Snowflake Procedure/);
    await change('Procedure name', 'retained_procedure');
    await select(/^Snowflake Task/);
    expect(field('Task name')).toHaveProperty('value', 'retained_task');
    expect(field('Warehouse')).toHaveProperty('value', 'retained_wh');
    await change('Warehouse', '');
    expect(field('Warehouse').getAttribute('aria-invalid')).toBe('true');
    expect(field('Warehouse').getAttribute('aria-describedby')).toContain(
      'template-parameter-warehouse-error'
    );
    expect(generated()).toBeNull();
    await select(/^Snowflake Procedure/);
    expect(generated()?.textContent).toContain('create or replace procedure retained_procedure()');
  } finally {
    await mounted.cleanup();
  }
});

it('preserves the project draft and uses create-only semantics when the user saves a copy', async () => {
  const path = 'dvt_templates/nightly.json';
  const content = encodeProjectTemplate({
    version: 1,
    baseTemplateId: 'snowflake-task',
    name: 'Nightly',
    source: 'select [[limit]]',
    values: {},
  });
  const file = {
    path,
    name: 'nightly.json',
    language: 'json',
    content,
    contentSha256: sha256HexUtf8(content),
    lastModified: '2026-11-18T12:00:00Z',
  };
  const save = vi
    .fn<IWorkspaceFileContentCommandPort['saveFileContent']>()
    .mockRejectedValueOnce(new WorkspaceFileRevisionConflictError(path))
    .mockImplementation(async (input) => ({
      ...file,
      kind: 'saved',
      disposition: 'created',
      path: input.path,
      contentSha256: sha256HexUtf8(input.content),
    }));
  const mounted = await withTestQueryClient(
    <AppServicesProvider
      overrides={{
        ...createAppServicesTestOverrides(),
        sessionContext: createMockSessionContextPort(),
        workspaceFilesQuery: {
          listFiles: async () => [{ name: file.name, path, kind: 'file' }],
          getFileContent: async () => file,
        },
        workspaceFileContentCommand: { saveFileContent: save },
      }}
    >
      <MemoryRouter>
        <TemplatesView />
      </MemoryRouter>
    </AppServicesProvider>
  );
  try {
    const ui = within(mounted.container);
    await waitForReactQuery(() => !!ui.queryByRole('button', { name: 'nightly' }));
    await act(async () => fireEvent.click(ui.getByRole('button', { name: 'nightly' })));
    await act(async () => fireEvent.click(ui.getByRole('button', { name: 'Edit template' })));
    await act(async () => fireEvent.click(ui.getByRole('button', { name: 'Save variant' })));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        path,
        expectedRevision: { kind: 'content_sha256', value: file.contentSha256 },
      })
    );
    expect(ui.getByRole('textbox', { name: 'Variant name' })).toHaveProperty('value', 'Nightly');
    expect(mounted.container.textContent).toContain('Another version exists');
    await act(async () =>
      fireEvent.change(ui.getByRole('textbox', { name: 'Variant name' }), {
        target: { value: 'Alternative' },
      })
    );
    await act(async () => fireEvent.click(ui.getByRole('button', { name: 'Save variant' })));
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: 'dvt_templates/alternative.json',
        expectedRevision: { kind: 'absent' },
      })
    );
    expect(JSON.parse(save.mock.calls[1]![0].content)).toMatchObject({
      source: 'select [[limit]]',
      name: 'Alternative',
    });
  } finally {
    await mounted.cleanup();
  }
});
