/**
 * Owned concern: expose the stable markdown parsing facade for docs governance tools.
 *
 * Keep docs governance consumers on this facade so helper modules can change
 * without creating another parser contract.
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
