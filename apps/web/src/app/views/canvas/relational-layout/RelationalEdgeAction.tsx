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
      onClick={onDisconnect}
      onKeyDown={(event) => {
        if (event.key !== 'Delete' && event.key !== 'Backspace') return;
        event.preventDefault();
        onDisconnect();
      }}
    />
  );
}
