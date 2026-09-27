/** Accessible hit target shared by removable relation lines. */
export function RelationalEdgeAction({
  path,
  label,
  slot,
  port,
  onDisconnect,
}: Readonly<{
  path: string;
  label: string;
  slot: string;
  port?: number;
  onDisconnect: () => void;
}>): JSX.Element {
  return (
    <g className="group/relational-edge">
      <path
        d={path}
        fill="none"
        stroke="var(--status-danger)"
        strokeWidth="3"
        pointerEvents="none"
        className="opacity-0 transition-opacity group-hover/relational-edge:opacity-100 group-focus-within/relational-edge:opacity-100"
      />
      <path
        data-slot={slot}
        data-port={port}
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="14"
        pointerEvents="stroke"
        className="pointer-events-auto cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={label}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onDisconnect}
        onKeyDown={(event) => {
          if (event.key !== 'Delete' && event.key !== 'Backspace') return;
          event.preventDefault();
          onDisconnect();
        }}
      >
        <title>{label}</title>
      </path>
    </g>
  );
}
