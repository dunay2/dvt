/**
 * Owned concern: typed file-session evidence and strict workspace port doubles for Code tests.
 * @decision Each test gets fresh ports; only declared fixture files can be read.
 * @consequence Unknown reads fail instead of manufacturing SQL or authorizing a context.
 */
import { sha256HexUtf8 } from '@dvt/crypto';
import { vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import type { IDbtProjectGraphQueryPort } from '../../ports/dbtProjectGraph';
import type { IDbtSelectedModelAnalysisQueryPort } from '../../ports/dbtSelectedModelAnalysis';
import type {
  FileContent,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import { contextFixture } from './codeWorkspaceFileContext.test-support';

type Scenario = {
  fixture: ReturnType<typeof contextFixture>;
  fileAuthority: FileContent['authoringAuthority'];
  graphOwned: boolean;
  parentMissing: boolean;
  graphSnapshot?: Promise<WorkspaceGraphSnapshot>;
  fileRead?: Promise<FileContent>;
};

export function createCodeContextWorkspaceFixture() {
  const scenario: Scenario = {
    fixture: contextFixture(),
    fileAuthority: undefined,
    graphOwned: false,
    parentMissing: false,
  };
  const graph = vi.fn<IDbtProjectGraphQueryPort['getProjectGraph']>(
    async () => scenario.fixture.project
  );
  const analysis = vi.fn<IDbtSelectedModelAnalysisQueryPort['analyzeSelectedModel']>(
    async () => scenario.fixture.analysis
  );
  const save = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(async (input) => {
    scenario.fixture = contextFixture(input.content);
    return {
      kind: 'saved',
      disposition: 'updated',
      path: input.path,
      contentSha256: scenario.fixture.file.contentSha256,
      lastModified: scenario.fixture.file.lastModified,
    };
  });
  const getFileContent: IWorkspaceFilesQueryPort['getFileContent'] = async (path) => {
    const { fixture } = scenario;
    if (path === fixture.file.path) {
      if (scenario.fileRead) return scenario.fileRead;
      return {
        ...fixture.file,
        authoringAuthority: scenario.fileAuthority ?? fixture.file.authoringAuthority,
      };
    }
    const declared = fixture.analysis.files.some(
      (file) => `${fixture.project.projectRevision.projectRoot}/${file.path}` === path
    );
    if (!declared) throw new WorkspaceFileLoadError('not_found', path);
    return {
      ...fixture.file,
      path,
      name: path.split('/').at(-1)!,
      content: 'select 1',
      contentSha256: sha256HexUtf8('select 1'),
    };
  };
  const getGraphSnapshot = async (): Promise<WorkspaceGraphSnapshot> =>
    scenario.graphSnapshot ?? {
      authoringAuthority: scenario.parentMissing
        ? { kind: 'unresolved', reason: 'missing_authority', canvasId: null }
        : mockGraphDraftAuthoringAuthority,
      edges: [],
      nodes: scenario.graphOwned
        ? [
            {
              id: 'owned',
              name: 'owned',
              type: 'MODEL',
              package: 'demo',
              path: scenario.fixture.file.path,
              tags: [],
              status: 'idle',
              dependencies: [],
            },
          ]
        : [],
    };
  return {
    scenario,
    graph,
    analysis,
    save,
    services: {
      ...createAppServicesTestOverrides(),
      workspaceFilesQuery: {
        listFiles: async () => [
          {
            path: scenario.fixture.file.path,
            name: scenario.fixture.file.name,
            kind: 'file' as const,
          },
        ],
        getFileContent,
      },
      workspaceGraphSnapshotQuery: { getGraphSnapshot },
      workspaceFileContentCommand: { saveFileContent: save },
      dbtProjectGraphQueryPort: { getProjectGraph: graph },
      dbtSelectedModelAnalysisQueryPort: { analyzeSelectedModel: analysis },
    },
  };
}
