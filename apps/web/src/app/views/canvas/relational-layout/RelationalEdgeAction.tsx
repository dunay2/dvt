/** Accessible selection and contextual removal shared by editable relation lines. */
import { RelationalConnectionMenu } from './RelationalConnectionMenu';

export function RelationalEdgeAction({
  path,
  removeLabel,
  slot,
  port,
  onSelect,
  onDisconnect,
}: Readonly<{
  path: string;
  removeLabel: string;
  slot: string;
  port?: number;
  onSelect?: () => void;
  onDisconnect: () => void;
}>): JSX.Element {
  return (
    <g className="group/relational-edge">
      <RelationalConnectionMenu removeLabel={removeLabel} onDisconnect={onDisconnect}>
        <path
          data-slot={slot}
          data-port={port}
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="14"
          pointerEvents="stroke"
          className="pointer-events-auto cursor-pointer focus:outline-none"
          role="button"
          tabIndex={0}
          aria-label={removeLabel}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
          onContextMenu={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault();
              event.stopPropagation();
              onDisconnect();
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect?.();
            }
          }}
        />
      </RelationalConnectionMenu>
    </g>
  );
}
