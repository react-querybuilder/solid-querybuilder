/**
 * Real gate from day one — not a placeholder. Both prior ports (Svelte, Vue) carried `test:ssr`
 * as a documented no-op until their step 8; Solid cannot afford that: the `solid` export
 * condition is the single most Solid-specific way to ship a broken package, and it is invisible
 * until something renders server-side.
 *
 * 1. Assert the **order** of the keys in `exports["."]` (`solid` first), then confirm it with
 *    Node's real resolver run twice — once with `--conditions=solid`, once without. Order is the
 *    whole point of this gate: a `solid` entry that merely *exists* but sits after `import` is
 *    silently dead, and a key-lookup check cannot see that.
 * 2. Compile-and-run a trivial consumer through Vite's SSR pipeline with
 *    `vite-plugin-solid({ solid: { generate: 'ssr', hydratable: false } })`, rendering with
 *    `renderToStringAsync` from `solid-js/web`, and assert the full markup.
 *
 * At step 1 the component under test is `Placeholder`; step 4 repoints this at `QueryBuilder`.
 * Step 8 adds a SolidStart SSR gate but keeps this script, because it is the only thing that
 * checks the export condition in isolation.
 */
import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(packageRoot, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `bun run build` first.');
  process.exit(1);
}

const fail = (msg: string): never => {
  console.error(`test:ssr FAILED — ${msg}`);
  process.exit(1);
};

// --- 1a. Condition order in the exports map ----------------------------------------------------
//
// Node picks the *first* matching key, so `solid` must precede `import`/`default`. This is a
// property of key order, not key presence: `{ import, types, solid }` still "has" a solid entry
// and is still completely broken for every SSR consumer.

const pkgJson = await Bun.file(resolve(packageRoot, 'package.json')).json();
const exportsMap = pkgJson.exports?.['.'];

if (!exportsMap || typeof exportsMap !== 'object') {
  fail('package.json has no `exports["."]` object.');
}

const conditionOrder = Object.keys(exportsMap);
const solidIndex = conditionOrder.indexOf('solid');

if (solidIndex === -1) {
  fail(`\`exports["."]\` has no "solid" condition (got: ${conditionOrder.join(', ')}).`);
}
if (solidIndex !== 0) {
  fail(
    `"solid" must be the FIRST condition in \`exports["."]\`, but it is at index ${solidIndex} ` +
      `(order: ${conditionOrder.join(', ')}). Anything matching earlier — "import" or "default" — ` +
      `wins for SSR consumers and the raw-JSX entry is never reached.`
  );
}

console.log(`exports["."] condition order: ${conditionOrder.join(' → ')} (solid first, ok)`);

// --- 1b. Confirm with Node's real resolver -----------------------------------------------------
//
// The authoritative check: the same specifier resolved twice, differing only in `--conditions`.
// `import.meta.resolve` honors the `--conditions` flag and implements the real exports algorithm,
// including order, so this catches anything the hand-rolled check above misses. Run from
// `packageRoot` so Node uses the package's own self-reference entry (no dependency on the
// workspace symlink existing).

const resolveWithNode = (conditions: string[]): string => {
  const args = [
    ...conditions.map(c => `--conditions=${c}`),
    '--input-type=module',
    '-e',
    `console.log(import.meta.resolve('solid-querybuilder'))`,
  ];
  const proc = Bun.spawnSync(['node', ...args], { cwd: packageRoot });
  if (proc.exitCode !== 0) {
    fail(
      `Node could not resolve 'solid-querybuilder' with conditions [${conditions.join(', ')}]:\n` +
        proc.stderr.toString()
    );
  }
  return fileURLToPath(proc.stdout.toString().trim());
};

const solidResolved = resolveWithNode(['solid']);
const defaultResolved = resolveWithNode([]);

const expectedSolid = resolve(distDir, 'source/index.jsx');
const expectedDefault = resolve(distDir, 'index.js');

if (solidResolved !== expectedSolid) {
  fail(
    `with --conditions=solid, Node resolved to ${relative(packageRoot, solidResolved)}, ` +
      `expected ${relative(packageRoot, expectedSolid)}. The "solid" condition is not winning.`
  );
}
if (defaultResolved !== expectedDefault) {
  fail(
    `without --conditions, Node resolved to ${relative(packageRoot, defaultResolved)}, ` +
      `expected ${relative(packageRoot, expectedDefault)}.`
  );
}
if (solidResolved === defaultResolved) {
  fail(
    'the solid and default conditions resolve to the same file — the two builds are not distinct.'
  );
}

console.log(`  --conditions=solid → ${relative(packageRoot, solidResolved)} (ok)`);
console.log(`  (default)          → ${relative(packageRoot, defaultResolved)} (ok)`);

// --- 2. Render through Vite's SSR pipeline -----------------------------------------------------

const { createServer } = await import('vite');
const solid = (await import('vite-plugin-solid')).default;

const vite = await createServer({
  root: packageRoot,
  configFile: false,
  logLevel: 'error',
  plugins: [solid({ solid: { generate: 'ssr', hydratable: false } })],
  // `solid` so the library resolves to its raw-JSX entry, `node` so `solid-js/web` resolves to
  // its SERVER build. Listing `solid` alone clobbers Vite's defaults and silently hands back
  // `solid-js/web`'s browser build, whose `renderToStringAsync` is a stub that throws. Never
  // add `browser` here.
  ssr: {
    noExternal: true,
    resolve: { conditions: ['solid', 'node', 'development'] },
  },
});

// The entry is loaded *through* Vite, and it imports both `solid-js/web` and the library itself.
// That is load-bearing: `ssr.noExternal` gives Vite's module graph its own copy of `solid-js`,
// so a `renderToStringAsync` imported out here in the host process would be a DIFFERENT instance
// than the one the component was compiled against. Solid keeps owner/`sharedConfig` state at
// module scope, so the two copies do not share it — a trivial component survives that, but
// anything using `createContext`/`createStore`/`createEffect` (i.e. `QueryBuilder`, from step 4)
// does not. Keep the render inside the graph.
const entry = resolve(packageRoot, 'scripts/ssr-smoke-entry.jsx');
const mod = await vite.ssrLoadModule(entry);
const html: string = await mod.render();

await vite.close();

const expectedHtml = '<div data-testid="solid-querybuilder-placeholder">ssr-smoke</div>';

if (html !== expectedHtml) {
  fail(`SSR markup mismatch.\n  expected: ${expectedHtml}\n  actual:   ${html}`);
}

console.log(`SSR render: ${html} (ok)`);
console.log('test:ssr passed.');
