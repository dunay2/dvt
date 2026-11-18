/** Open JOIN type choices at the glyph, using its canonical or configured staged working copy. */
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import { CanvasStagedAnalysisProvider } from './CanvasStagedAnalysisProvider';
import type { CanvasJoinTypeChangeAuthority } from './CanvasJoinTypeChangeContext';
import { projectCanvasStagedCompositionUpdate } from './canvasStagedCompositionUpdate';
import { resolveCanvasStagedEditingDocument } from './canvasStagedOperationDocument';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { useSelectedJoin } from './useSelectedJoin';
import { useCanvasJoinTypeControl } from './useCanvasJoinTypeControl';
import type { SelectedJoin } from './canvasSelectedJoin';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import styles from './CanvasRelationalTreeCard.module.css';

type MenuProps = Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  authority: CanvasJoinTypeChangeAuthority;
  relationId: string;
  staged?: CanvasStagedOperation;
}>;

export function CanvasJoinTypeIconMenu(props: MenuProps & { title: string }) {
  const [open, setOpen] = useState(false);
  const label = `${props.copy.inspectorDvtSubstraitJoinTypeLabel}: ${props.title}`;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-slot="canvas-join-type-trigger"
          className={styles.joinTypeTrigger}
          aria-label={label}
          title={label}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <CanvasRelationalJoinIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onDoubleClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel>{props.copy.inspectorDvtSubstraitJoinTypeLabel}</DropdownMenuLabel>
        <JoinMenuBody {...props} close={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function JoinMenuBody({ staged, authority, ...menu }: MenuProps & { close: () => void }) {
  const document = useMemo(
    () =>
      staged == null
        ? null
        : resolveCanvasStagedEditingDocument(staged, authority.stagedOperations),
    [staged, authority.stagedOperations]
  );
  if (staged == null) return <JoinChoices {...menu} change={authority.changeDraft} />;
  if (document == null)
    return (
      <DropdownMenuItem disabled>
        {menu.copy.inspectorDvtRelationalTargetUnavailable}
      </DropdownMenuItem>
    );
  return (
    <CanvasStagedAnalysisProvider
      document={document}
      scope={staged.id}
      binding={authority.analysisBinding}
    >
      <JoinChoices
        {...menu}
        change={(next) => {
          const update = projectCanvasStagedCompositionUpdate(next, staged);
          return update != null && authority.updateStagedOperation(staged.id, update);
        }}
      />
    </CanvasStagedAnalysisProvider>
  );
}

type ChoiceProps = Pick<MenuProps, 'copy' | 'relationId'> & {
  close: () => void;
  change: CanvasJoinTypeChangeAuthority['changeDraft'];
};

function JoinChoices(props: ChoiceProps) {
  const selected = useSelectedJoin(props.relationId);
  return selected == null ? (
    <DropdownMenuItem disabled>
      {props.copy.inspectorDvtRelationalTargetUnavailable}
    </DropdownMenuItem>
  ) : (
    <AvailableJoinChoices {...props} selected={selected} />
  );
}

function AvailableJoinChoices({
  selected,
  copy,
  change,
  close,
}: ChoiceProps & { selected: SelectedJoin }) {
  const control = useCanvasJoinTypeControl(selected, copy, change);
  return (
    <>
      <DropdownMenuRadioGroup value={String(selected.type)}>
        {control.choices.map((choice) => (
          <DropdownMenuRadioItem
            key={choice.type}
            value={String(choice.type)}
            disabled={choice.disabled || control.state === 'busy'}
            onSelect={(event) => {
              event.preventDefault();
              if (selected.type === choice.type) close();
              else
                void control.select(choice.type).then((accepted) => {
                  if (accepted) close();
                });
            }}
          >
            {choice.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      {control.state === 'error' && (
        <DropdownMenuLabel role="alert">{copy.inspectorDvtRelationalUnavailable}</DropdownMenuLabel>
      )}
    </>
  );
}
