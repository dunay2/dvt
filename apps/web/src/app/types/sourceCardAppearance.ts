/** Layout preferences for the visual representation of one placed Source. */
export type SourceCardAppearance = Readonly<{
  tags: boolean;
  columns: boolean;
  rows: boolean;
  size: boolean;
  qualifiedName: boolean;
  types: boolean;
  nullability: boolean;
  color: string | null;
}>;

export const DEFAULT_SOURCE_CARD_APPEARANCE: SourceCardAppearance = Object.freeze({
  tags: true,
  columns: true,
  rows: false,
  size: false,
  qualifiedName: true,
  types: true,
  nullability: true,
  color: null,
});

export function resolveSourceCardAppearance(
  value?: Partial<SourceCardAppearance>
): SourceCardAppearance {
  const defaults = DEFAULT_SOURCE_CARD_APPEARANCE;
  if (value == null) return defaults;
  const color = value.color;
  return {
    tags: value.tags !== false,
    columns: value.columns !== false,
    rows: value.rows === true,
    size: value.size === true,
    qualifiedName: value.qualifiedName !== false,
    types: value.types !== false,
    nullability: value.nullability !== false,
    color:
      typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
        ? color.toLowerCase()
        : defaults.color,
  };
}
