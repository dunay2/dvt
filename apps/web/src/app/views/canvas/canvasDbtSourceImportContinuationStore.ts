/** Owned concern: carry one dbt source-binding continuation across Canvas authority remounts. */
import type { DbtProjectSourceTableDeclaration } from '@dvt/contracts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SourceImportInitialSelection } from '../../components/sourceImportWizard/types';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';

type DbtSourceImportContinuation = Readonly<{
  authorityKey: string;
  initialSelection: SourceImportInitialSelection;
}>;

type CanvasDbtSourceImportContinuationState = Readonly<{
  pending: DbtSourceImportContinuation | null;
  enqueue: (
    authorityBinding: DbtProjectFilesAuthorityBinding,
    sourceTableDeclarations: readonly DbtProjectSourceTableDeclaration[]
  ) => void;
  consume: (authorityBinding: DbtProjectFilesAuthorityBinding) => void;
}>;

export const CANVAS_DBT_SOURCE_IMPORT_CONTINUATION_STORAGE_KEY =
  'dvt:canvas:dbt-source-import-continuation:v1';

function authorityKey(authorityBinding: DbtProjectFilesAuthorityBinding): string {
  return `${authorityBinding.canvasId}::${authorityBinding.authority.projectRoot}`;
}

export function resolveDbtSourceImportContinuation(
  pending: DbtSourceImportContinuation | null,
  authorityBinding: DbtProjectFilesAuthorityBinding
): SourceImportInitialSelection | undefined {
  return pending?.authorityKey === authorityKey(authorityBinding)
    ? pending.initialSelection
    : undefined;
}

export const useCanvasDbtSourceImportContinuationStore =
  create<CanvasDbtSourceImportContinuationState>()(
    persist(
      (set) => ({
        pending: null,
        enqueue: (authorityBinding, sourceTableDeclarations) => {
          set({
            pending:
              sourceTableDeclarations.length === 0
                ? null
                : {
                    authorityKey: authorityKey(authorityBinding),
                    initialSelection: {
                      kind: 'dbt-source-binding',
                      sourceTableDeclarations,
                    },
                  },
          });
        },
        consume: (authorityBinding) => {
          set((state) =>
            state.pending?.authorityKey === authorityKey(authorityBinding)
              ? { pending: null }
              : state
          );
        },
      }),
      {
        name: CANVAS_DBT_SOURCE_IMPORT_CONTINUATION_STORAGE_KEY,
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ pending: state.pending }),
      }
    )
  );
