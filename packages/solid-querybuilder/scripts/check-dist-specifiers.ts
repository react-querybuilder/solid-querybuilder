/**
 * Guards the published output against unresolvable relative import specifiers.
 *
 * Rollup rewrites specifiers in the emitted JS, but `tsc` copies them through verbatim into the
 * `.d.ts` files (`rewriteRelativeImportExtensions` is off), so an extensionless or directory
 * import in `src` survives into `dist` and breaks Node16/NodeNext ESM resolution for consumers
 * (`ERR_UNSUPPORTED_DIR_IMPORT`). Bundlers tolerate it, so nothing else in CI notices.
 *
 * Two Solid-specific allowances on top of the base rule:
 *   - A `./foo.js` specifier inside a `.d.ts` may legitimately resolve to a sibling `foo.d.ts`
 *     with no `foo.js` beside it — that is what a type-only module looks like after the bundler
 *     erases it.
 *   - A `./foo.jsx` specifier is allowed under `dist/source` (the `tsc --jsx preserve` bundle
 *     resolved through the `solid` export condition), since that tree ships `.jsx` files, not
 *     `.js`.
 */
import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const distDir = resolve(new URL('..', import.meta.url).pathname, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `bun run build` first.');
  process.exit(1);
}

/** Extensions that resolve without further lookup in Node ESM. */
const RESOLVABLE = ['.js', '.jsx', '.css', '.scss', '.json'];

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;

const isUnderSource = (file: string): boolean => file.includes(`${resolve(distDir, 'source')}/`);

/**
 * A `./foo.js` (or `./foo.jsx`) specifier in a `.d.ts` file may also legitimately resolve to a
 * sibling `foo.d.ts` with no `foo.js`/`foo.jsx` alongside it: that is what a type-only or
 * bundler-erased module looks like. TypeScript resolves the specifier through the declaration
 * file, and the import itself never exists at runtime in that directory (`dist/source` is where
 * the real `.jsx` lives, resolved instead through the `solid` export condition).
 */
const resolvesTo = (from: string, spec: string): boolean => {
  const abs = resolve(dirname(from), spec);
  if (existsSync(abs)) return true;
  if (from.endsWith('.d.ts') && (spec.endsWith('.js') || spec.endsWith('.jsx'))) {
    return existsSync(abs.replace(/\.jsx?$/, '.d.ts'));
  }
  return false;
};

const failures: string[] = [];

for await (const rel of new Glob('**/*.{js,jsx,d.ts}').scan(distDir)) {
  const file = resolve(distDir, rel);
  const source = await Bun.file(file).text();

  for (const [, , spec] of source.matchAll(SPECIFIER)) {
    if (spec.endsWith('.jsx') && !isUnderSource(file) && !file.endsWith('.d.ts')) {
      failures.push(`${rel}: '${spec}' — .jsx specifiers are only expected under dist/source`);
      continue;
    }
    if (!RESOLVABLE.some(ext => spec.endsWith(ext))) {
      failures.push(`${rel}: '${spec}' has no file extension (directory or extensionless import)`);
      continue;
    }
    if (!resolvesTo(file, spec)) {
      failures.push(`${rel}: '${spec}' does not exist in dist/`);
    }
  }
}

if (failures.length > 0) {
  console.error('Unresolvable relative specifiers in dist/:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    `\n${failures.length} problem(s). Relative imports in src must carry explicit .js extensions.`
  );
  process.exit(1);
}

console.log('dist/ relative specifiers OK.');
