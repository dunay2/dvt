/** Owned concern: quote one SQL identifier without changing its semantic value. */
export function quoteSqlIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
