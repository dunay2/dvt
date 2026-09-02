/** Owned concern: constrain editable Canvas business tags without changing semantic tags. */
const CANVAS_NODE_BUSINESS_TAG_MAX_LENGTH = 32;

function limitTagSegment(segment: string): string {
  const leadingWhitespace = segment.match(/^\s*/u)?.[0] ?? '';
  return `${leadingWhitespace}${segment
    .slice(leadingWhitespace.length)
    .slice(0, CANVAS_NODE_BUSINESS_TAG_MAX_LENGTH)}`;
}

export function limitCanvasNodeTagsText(value: string): string {
  return value.split(',').map(limitTagSegment).join(',');
}
