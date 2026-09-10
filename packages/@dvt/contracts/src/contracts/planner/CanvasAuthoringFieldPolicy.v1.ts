/**
 * Owned concern: define the single v1 data budget for editable Canvas fields.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Enforce one shared budget contract across Canvas, API, and persistence boundaries.
 * @consequence Invalid authoring values fail closed without silent truncation or mutation.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  isIsoUtcString,
  isNonBlankString,
  NON_BLANK_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

export const CANVAS_AUTHORING_FIELD_LIMITS_V1 = {
  humanNameCodePoints: 256,
  descriptionCodePoints: 4096,
  tagCodePoints: 32,
  tagsPerNode: 32,
  postgresIdentifierUtf8Bytes: 63,
  stringLiteralUtf8Bytes: 4096,
} as const;

export function countUnicodeCodePoints(value: string): number {
  return [...value].length;
}

export function countUtf8Bytes(value: string): number {
  let byteCount = 0;
  for (const symbol of value) {
    const codePoint = symbol.codePointAt(0)!;
    byteCount += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return byteCount;
}

export function isWellFormedCanvasText(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0) return false;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

const WellFormedCanvasTextSchema = z.string().refine(isWellFormedCanvasText, {
  message: 'Canvas authoring text must be valid Unicode and must not contain NUL.',
});

function boundedCodePointString(maximum: number, label: string): z.ZodString {
  return WellFormedCanvasTextSchema.refine((value) => countUnicodeCodePoints(value) <= maximum, {
    message: `${label} must contain at most ${maximum} Unicode code points.`,
  });
}

function boundedUtf8String(maximum: number, label: string): z.ZodString {
  return WellFormedCanvasTextSchema.refine((value) => countUtf8Bytes(value) <= maximum, {
    message: `${label} must contain at most ${maximum} UTF-8 bytes.`,
  });
}

export const CanvasHumanNameV1Schema = WellFormedCanvasTextSchema.transform((value) =>
  value.trim()
).pipe(
  boundedCodePointString(
    CANVAS_AUTHORING_FIELD_LIMITS_V1.humanNameCodePoints,
    'Canvas authoring name'
  ).refine((value): boolean => isNonBlankString(value), { message: NON_BLANK_STRING_MESSAGE })
);

export const CanvasDescriptionV1Schema = boundedCodePointString(
  CANVAS_AUTHORING_FIELD_LIMITS_V1.descriptionCodePoints,
  'Canvas authoring description'
).refine((value): boolean => isNonBlankString(value), { message: NON_BLANK_STRING_MESSAGE });

export const CanvasTagV1Schema = WellFormedCanvasTextSchema.transform((value) => value.trim()).pipe(
  boundedCodePointString(
    CANVAS_AUTHORING_FIELD_LIMITS_V1.tagCodePoints,
    'Canvas authoring tag'
  ).refine((value): boolean => isNonBlankString(value), { message: NON_BLANK_STRING_MESSAGE })
);

export const CanvasTagsV1Schema = z
  .array(CanvasTagV1Schema)
  .max(CANVAS_AUTHORING_FIELD_LIMITS_V1.tagsPerNode)
  .superRefine((tags, context) => {
    const normalizedTags = new Set<string>();
    tags.forEach((tag, index) => {
      const normalizedTag = tag.trim();
      if (normalizedTags.has(normalizedTag)) {
        context.addIssue({
          code: 'custom',
          message: 'Canvas authoring tags must be unique after trimming.',
          path: [index],
        });
      }
      normalizedTags.add(normalizedTag);
    });
  });

export const PostgresIdentifierV1Schema = boundedUtf8String(
  CANVAS_AUTHORING_FIELD_LIMITS_V1.postgresIdentifierUtf8Bytes,
  'PostgreSQL identifier'
)
  .refine((value): boolean => isNonBlankString(value), { message: NON_BLANK_STRING_MESSAGE })
  .refine((value) => value === value.trim(), {
    message: 'PostgreSQL identifiers must not contain exterior whitespace.',
  });

export const DvtStringLiteralV1Schema = boundedUtf8String(
  CANVAS_AUTHORING_FIELD_LIMITS_V1.stringLiteralUtf8Bytes,
  'DVT string literal'
);

export const DvtTimestampLiteralV1Schema = WellFormedCanvasTextSchema.refine(isIsoUtcString, {
  message: 'DVT timestamp literals must use canonical RFC 3339 UTC millisecond form.',
});
