/** Serialize editable project recipes as portable, versioned workspace files. */
import { z } from 'zod';

const projectTemplateSchema = z
  .object({
    version: z.literal(1),
    baseTemplateId: z.string().min(1),
    name: z.string().trim().min(1),
    source: z.string(),
    values: z.record(z.string(), z.string()),
  })
  .strict();

export type ProjectTemplateFile = z.infer<typeof projectTemplateSchema>;

export function decodeProjectTemplate(content: string): ProjectTemplateFile | null {
  try {
    const parsed = projectTemplateSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function encodeProjectTemplate(template: ProjectTemplateFile): string {
  return JSON.stringify(projectTemplateSchema.parse(template), null, 2) + '\n';
}

export function projectTemplatePath(name: string): string | null {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return /^[a-z0-9][a-z0-9_-]{0,79}$/.test(slug) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(slug)
    ? `dvt_templates/${slug}.json`
    : null;
}
