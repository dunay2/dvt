/**
 * @file tools/docs/lib/markdown.ts
 * Public markdown parsing facade for docs governance tools.
 */
export {
  parseFrontmatter,
  readIfExists,
  splitFrontmatter,
  type FrontmatterResult,
} from './markdownFrontmatter.js';
export { extractAdrFields } from './markdownAdrFields.js';
export { extractAnchors } from './markdownAnchors.js';
export { extractLinks, type MarkdownLink } from './markdownLinks.js';
