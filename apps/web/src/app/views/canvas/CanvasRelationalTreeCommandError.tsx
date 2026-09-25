/** Present the one transient relation-command failure without owning command state. */
export function CanvasRelationalTreeCommandError({
  visible,
  message,
}: Readonly<{ visible: boolean; message: string }>): JSX.Element | null {
  if (!visible) return null;
  return (
    <p
      role="alert"
      className="absolute right-3 top-12 z-20 rounded bg-(--surface-panel) p-3 text-sm"
    >
      {message}
    </p>
  );
}
