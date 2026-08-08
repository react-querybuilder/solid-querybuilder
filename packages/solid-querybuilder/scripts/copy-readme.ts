/**
 * Copies the repo-root README into the package directory for publishing.
 *
 * Relative links (`./docs/...`, `./examples/...`) are rewritten to absolute GitHub URLs
 * since they have no meaning on npmjs.com.
 */
const REPO_BLOB = 'https://github.com/react-querybuilder/solid-querybuilder/blob/main/';
const REPO_TREE = 'https://github.com/react-querybuilder/solid-querybuilder/tree/main/';

const source = new URL('../../../README.md', import.meta.url);
const target = new URL('../README.md', import.meta.url);

const readme = await Bun.file(source).text();

const rewritten = readme.replace(/\]\(\.\/([^)]+)\)/g, (_match, path: string) => {
  const base = /\.[a-z0-9]+$/i.test(path) ? REPO_BLOB : REPO_TREE;
  return `](${base}${path})`;
});

await Bun.write(target, rewritten);
