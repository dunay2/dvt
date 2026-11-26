// @vitest-environment jsdom
/** Prove that choosing a destination is separate from publishing a model. */
import { act } from 'react';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, expect, it, vi } from 'vitest';
import { sha256HexUtf8 } from '@dvt/crypto';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { FileContent } from '../../ports/workspace';
import {
  AppServicesProvider,
  useWorksheetDbtModelCommand,
} from '../../services/AppServicesContext';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createMockSessionContextPort } from '../../../testing/runsPortDoubles';
import { withTestQueryClient, waitForReactQuery } from '../../../testing/reactQueryHarness';
import { SqlWorksheetConversion } from './SqlWorksheetConversion';

const config = 'name: demo\nversion: 1.0.0\n';
const path = 'demo/dbt_project.yml';
const modelPath = 'demo/models/quarter.sql';
const sql = 'select 42 as amount';
const baseFile: FileContent = {
  path,
  name: 'dbt_project.yml',
  language: 'yaml',
  lastModified: '',
  content: config,
  contentSha256: sha256HexUtf8(config),
};
const document: FileContent = {
  ...baseFile,
  authoringAuthority: {
    kind: 'resolved',
    binding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'demo-files',
      authority: { kind: 'dbt-project-files', projectRoot: 'demo' },
    },
  },
};
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

type Harness = Record<'read' | 'tree' | 'create', ReturnType<typeof vi.fn>> & {
  scope: WorkspaceScope;
};
async function setup(file: FileContent = document): Promise<Harness> {
  const sessionContext = createMockSessionContextPort();
  const scope = sessionContext.getWorkspaceScopeSnapshot();
  const read = vi.fn().mockResolvedValue(file);
  const tree = vi.fn().mockResolvedValue([{ path, kind: 'file', name: 'dbt_project.yml' }]);
  const create = vi
    .fn()
    .mockResolvedValue({ kind: 'created', path: modelPath, contentSha256: sha256HexUtf8(sql) });
  const overrides = {
    ...createAppServicesTestOverrides(),
    sessionContext,
    worksheetDbtModelCommand: { create },
    workspaceFilesQuery: { listFiles: tree, getFileContent: read },
  };
  mounted = await withTestQueryClient(
    <AppServicesProvider overrides={overrides}>
      <SqlWorksheetConversion
        sql={sql}
        connection={null}
        record={null}
        scope={scope}
        insertions={[]}
      />
    </AppServicesProvider>
  );
  act(() => screen.getByRole('button', { name: 'Convert to model' }).click());
  return { scope, read, tree, create };
}

async function chooseDbt(read: ReturnType<typeof vi.fn>): Promise<void> {
  act(() => screen.getByRole('radio', { name: 'dbt project file' }).click());
  await waitForReactQuery(() => read.mock.calls.length > 0);
  await act(() =>
    fireEvent.change(screen.getByRole('textbox', { name: 'Model name' }), {
      target: { value: 'quarter' },
    })
  );
}

it('opens a neutral destination choice and reads project files only after choosing dbt', async () => {
  const { tree, read, create } = await setup();
  expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(
    true
  );
  expect(tree).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it('publishes once to the confirmed dbt project after explicit submission', async () => {
  const { create, scope, read } = await setup();
  await chooseDbt(read);
  const submit = screen.getByRole('button', { name: 'Create dbt model' }) as HTMLButtonElement;
  await waitForReactQuery(() => !submit.disabled);
  expect(create).not.toHaveBeenCalled();
  await act(async () => {
    submit.click();
    submit.click();
  });
  expect(create).toHaveBeenCalledExactlyOnceWith(scope, {
    canvasId: 'demo-files',
    projectRoot: 'demo',
    configSha256: document.contentSha256,
    name: 'quarter',
    sql,
    requestId: expect.any(String),
  });
  expect(screen.getByRole('status').textContent).toContain(modelPath);
});

it('keeps a conflicting publication visible and reuses the identity when retrying', async () => {
  const { create, read } = await setup();
  create.mockResolvedValue({ kind: 'refused', reason: 'conflict' });
  await chooseDbt(read);
  const submit = screen.getByRole('button', { name: 'Create dbt model' }) as HTMLButtonElement;
  await waitForReactQuery(() => !submit.disabled);
  await act(async () => submit.click());
  expect(screen.getByRole('alert').textContent).toContain('model already exists');
  await act(async () => submit.click());
  expect(create.mock.calls[0]).toEqual(create.mock.calls[1]);
});

it.each([baseFile, { ...document, contentSha256: '0'.repeat(64) }])(
  'requires confirmed file authority and configuration bytes to submit',
  async (file) => {
    const { create, read } = await setup(file);
    await chooseDbt(read);
    await waitForReactQuery(
      () => screen.queryByText('Select a project with current dbt file authority.') != null
    );
    const submit = screen.getByRole('button', { name: 'Create dbt model' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(create).not.toHaveBeenCalled();
  }
);

it('retains the selected model name when comparing destinations without submitting either form', async () => {
  const { read, create } = await setup();
  await chooseDbt(read);
  act(() => screen.getByRole('radio', { name: 'Active Canvas' }).click());
  act(() => screen.getByRole('radio', { name: 'dbt project file' }).click());
  expect((screen.getByRole('textbox', { name: 'Model name' }) as HTMLInputElement).value).toBe(
    'quarter'
  );
  expect(create).not.toHaveBeenCalled();
});

it('exposes a new publication command when that is the only changed service override', async () => {
  const services = createAppServicesTestOverrides();
  const first = { create: vi.fn() };
  const second = { create: vi.fn() };
  function Identity(): React.JSX.Element {
    const command = useWorksheetDbtModelCommand();
    return (
      <output>{command === first ? 'first' : command === second ? 'second' : 'unexpected'}</output>
    );
  }
  const render = (command: typeof first): React.JSX.Element => (
    <AppServicesProvider overrides={{ ...services, worksheetDbtModelCommand: command }}>
      <Identity />
    </AppServicesProvider>
  );
  mounted = await withTestQueryClient(render(first));
  expect(screen.getByRole('status').textContent).toBe('first');
  await mounted.render(render(second));
  expect(screen.getByRole('status').textContent).toBe('second');
});
