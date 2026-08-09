/**
 * Real gate from day one — not a placeholder. The `solid` export
 * condition is the single most Solid-specific way to ship a broken package, and it is invisible
 * until something renders server-side.
 *
 * 1. Assert the **order** of the keys in `exports["."]` (`solid` first), then confirm it with
 *    Node's real resolver run twice — once with `--conditions=solid`, once without. Order is the
 *    whole point of this gate: a `solid` entry that merely *exists* but sits after `import` is
 *    silently dead, and a key-lookup check cannot see that.
 * 2. Compile-and-run a trivial consumer through Vite's SSR pipeline with
 *    `vite-plugin-solid({ solid: { generate: 'ssr', hydratable: false } })`, rendering with
 *    `renderToString` from `@solidjs/web` (synchronous in Solid 2), and assert the full
 *    markup.
 *
 * The component under test is `QueryBuilder` — it exercises `createContext`, `createStore`, and
 * `createEffect`, which is what makes the single-Solid-instance requirement below load-bearing
 * rather than theoretical. A SolidStart SSR gate would supersede this script but not replace it,
 * because it is the only thing that checks the export condition in isolation.
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
  // NO hand-written `ssr.resolve.conditions`. `vite-plugin-solid@3` gives the ssr environment
  // `['solid', 'development', 'module', 'node', 'development|production']` on its own — measured,
  // not assumed — which resolves the library to its raw-JSX entry (`solid`) and `@solidjs/web` to
  // `dist/server.js` (`node`). The Solid 1 value `['solid', 'node', 'development']` was
  // compensating for the 2.x plugin and now only *removes* `module` and
  // `development|production` from that list.
  //
  // The failure this guards against is unchanged: `@solidjs/web`'s exports map lists `browser`
  // BEFORE `node`, so any condition set carrying `browser` hands back the browser build, whose
  // server renderer is a stub that throws. Never add `browser` here.
  ssr: {
    noExternal: true,
  },
});

// The entry is loaded *through* Vite, and it imports both `@solidjs/web` and the library itself.
// That is load-bearing: `ssr.noExternal` gives Vite's module graph its own copy of `solid-js`,
// so a `renderToString` imported out here in the host process would be a DIFFERENT instance
// than the one the component was compiled against. Solid keeps owner/`sharedConfig` state at
// module scope, so the two copies do not share it — a trivial component survives that, but
// anything using `createContext`/`createStore`/`createEffect` (i.e. `QueryBuilder`)
// does not. Keep the render inside the graph.
const entry = resolve(packageRoot, 'scripts/ssr-smoke-entry.jsx');
const mod = await vite.ssrLoadModule(entry);
const html: string = mod.render();

await vite.close();

// The markup assertion. Not a full-string comparison: the rendered tree is ~2KB and dominated
// by the default operator list, which would make this a snapshot in all but name. Instead it
// asserts every structural claim the SSR path is here to make — that the wrapper, the group, the
// rule, and each of the rule's controls all rendered, with the *value* of the controlled query
// present — plus the exact number of `data-testid` elements, so a dropped or added control turns
// this red.
const requiredFragments = [
  '<div role="form" class="queryBuilder" data-dnd="disabled" data-inlinecombinators="disabled">',
  'data-testid="rule-group"',
  'class="ruleGroup-header"',
  'data-testid="combinators"',
  'data-testid="add-rule"',
  'data-testid="add-group"',
  'class="ruleGroup-body"',
  'data-testid="rule"',
  'data-path="[0]"',
  'data-testid="fields"',
  'data-testid="operators"',
  'data-testid="value-editor"',
  'value="v1"',
  'data-testid="remove-rule"',
];

const expectedTestIdCount = 9;

for (const fragment of requiredFragments) {
  if (!html.includes(fragment)) {
    fail(`SSR markup is missing ${fragment}.\n  actual: ${html}`);
  }
}

const testIdCount = html.match(/data-testid=/g)?.length ?? 0;
if (testIdCount !== expectedTestIdCount) {
  fail(
    `SSR markup has ${testIdCount} \`data-testid\` elements, expected ${expectedTestIdCount}.` +
      `\n  actual: ${html}`
  );
}

console.log(`SSR render: ${testIdCount} controls, all structural fragments present (ok)`);
console.log('test:ssr passed.');
