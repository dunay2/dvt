/** Passive materialization control; the supplied command owns validation and persistence. */
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { GraphNodeMaterializationControl } from './graphNodeCardStrategyContracts';
import { graphNodeMaterializationClasses as styles } from './graphMetricVisualTokens';

export function GraphNodeMaterializationMenu({
  control,
  icon,
}: Readonly<{
  control: GraphNodeMaterializationControl;
  icon: ReactNode;
}>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="graph-node-materialization"
          data-canvas-node-control="true"
          aria-label={control.label}
          disabled={control.disabled}
          className={styles.trigger}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {icon}
          <span className={styles.value}>
            {control.options.find((option) => option.value === control.value)?.label ??
              control.value}
          </span>
          <ChevronDown aria-hidden="true" className={styles.chevron} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={styles.menu}
        aria-label={control.label}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenuRadioGroup value={control.value} onValueChange={control.onChange}>
          {control.options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className={styles.option}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
