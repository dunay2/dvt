/** Owned concern: identify relational JOINs with intersecting sets, not a Git operation. */
export function CanvasRelationalJoinIcon({
  className = 'size-4',
}: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      data-slot="relational-join-icon"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle cx="8.5" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.5" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 6.52a6.5 6.5 0 0 1 0 10.96 6.5 6.5 0 0 1 0-10.96Z"
        fill="currentColor"
        fillOpacity=".4"
      />
    </svg>
  );
}
