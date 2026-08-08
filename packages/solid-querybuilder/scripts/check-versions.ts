/**
 * Resolved-version assertions for the pinned Solid 2 prerelease toolchain.
 *
 * The whole matrix sits on prereleases, and a `bun install` that silently drifts onto a newer
 * beta — or, worse, onto `@solidjs/web`'s `latest` tag, which is the incompatible
 * `2.0.0-experimental.0` line — is the single most likely cause of an inexplicable failure in
 * this repo. It should report itself as a version drift, not as 200 broken assertions.
 *
 * Runs before every other gate in CI.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const failures: string[] = [];

const read = async (pkg: string): Promise<string | undefined> => {
  const manifest = resolve(repoRoot, 'node_modules', pkg, 'package.json');
  if (!existsSync(manifest)) return undefined;
  const json = await Bun.file(manifest).json();
  return json.version as string;
};

// Exact pins. `solid-js` and `@solidjs/web` must move together, and only deliberately.
const exact: Record<string, string> = {
  'solid-js': '2.0.0-beta.32',
  '@solidjs/web': '2.0.0-beta.32',
  'vite-plugin-solid': '3.0.0-next.23',
  '@solidjs/testing-library': '1.0.0-beta.2',
};

for (const [pkg, want] of Object.entries(exact)) {
  const got = await read(pkg);
  if (got === undefined) {
    failures.push(`${pkg} is not installed`);
  } else if (got !== want) {
    failures.push(`${pkg} resolved to ${got}, expected exactly ${want}`);
  }
}

// Line assertions. These catch the two drifts that produce confusing *compile* errors rather
// than a resolution failure, and they stay correct if the exact pins above are bumped.
const pluginVersion = await read('vite-plugin-solid');
if (pluginVersion && !pluginVersion.startsWith('3.')) {
  failures.push(`vite-plugin-solid must be on the 3.x line, got ${pluginVersion}`);
}

const webVersion = await read('@solidjs/web');
if (webVersion?.includes('-experimental.')) {
  failures.push(
    `@solidjs/web resolved to the experimental line (${webVersion}). That is npm's \`latest\` ` +
      `tag and vite-plugin-solid@3 explicitly excludes it (<2.0.0-experimental.0). Install from ` +
      `the \`next\` tag.`
  );
}

// The DOM runtime is compiled against the core package; a split between them is silent and fatal.
const solidVersion = await read('solid-js');
if (solidVersion && webVersion && solidVersion !== webVersion) {
  failures.push(
    `solid-js (${solidVersion}) and @solidjs/web (${webVersion}) must be the same version`
  );
}

if (failures.length > 0) {
  console.error('check:versions FAILED — the Solid 2 toolchain drifted:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `check:versions ok — solid-js ${solidVersion}, @solidjs/web ${webVersion}, ` +
    `vite-plugin-solid ${pluginVersion}`
);
