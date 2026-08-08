/**
 * Downloads the conformance fixture set published by `react-querybuilder` as a release asset and
 * extracts it into `test/fixtures/` (gitignored).
 *
 * The fixtures are the contract this port is held to: the `class` attribute of every rendered
 * element, the accessible description of every rule group, and the result of every curated
 * mutation sequence. They are *not* generated here — regenerating them locally would make the
 * tests tautological.
 *
 * The pinned tag is a deliberate constant rather than "latest": a fixture set changes when
 * upstream rendering changes, and that should surface as a reviewed bump here, not as a
 * mysterious CI failure on an unrelated PR.
 */

import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * The upstream release whose fixtures this port is verified against. Bump deliberately, and
 * expect a diff in the conformance tests when you do.
 */
export const CONFORMANCE_TAG = 'v8.22.4';

/**
 * The fixture *shape* version. Not the tag: upstream may cut a dozen releases without changing
 * the schema, and a schema change must fail loudly rather than be mis-read.
 */
export const EXPECTED_SCHEMA_VERSION = 2;

const ASSET = 'rqb-conformance-fixtures.tar.gz';
const RELEASE_URL = `https://github.com/react-querybuilder/react-querybuilder/releases/download/${CONFORMANCE_TAG}`;

export const fixturesDir: string = path.resolve(import.meta.dirname, '../test/fixtures');

const download = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
};

/**
 * The tarball is not byte-reproducible across generation runs (BSD `tar` has no `--sort`/
 * `--mtime`), so the checksum is only meaningful against the sidecar published *with that
 * archive*. Both are therefore downloaded from the same release, and the check guards transport,
 * not provenance.
 */
const verifyChecksum = (archive: ArrayBuffer, sidecar: string) => {
  const expected = sidecar.trim().split(/\s+/)[0];
  const actual = new Bun.CryptoHasher('sha256').update(archive).digest('hex');
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${ASSET}: expected ${expected}, got ${actual}`);
  }
};

export const fetchFixtures = async (): Promise<void> => {
  const [archive, sidecar] = await Promise.all([
    download(`${RELEASE_URL}/${ASSET}`),
    download(`${RELEASE_URL}/${ASSET}.sha256`).then(b => new TextDecoder().decode(b)),
  ]);

  verifyChecksum(archive, sidecar);

  // Wipe first, so a fixture file dropped upstream cannot linger locally and keep a stale test passing.
  await rm(fixturesDir, { recursive: true, force: true });
  await mkdir(fixturesDir, { recursive: true });

  const archivePath = path.join(fixturesDir, ASSET);
  await Bun.write(archivePath, archive);

  const untar = Bun.spawnSync(['tar', '-xzf', archivePath, '-C', fixturesDir]);
  if (untar.exitCode !== 0) {
    throw new Error(`tar failed: ${new TextDecoder().decode(untar.stderr)}`);
  }
  await rm(archivePath);

  const index = await Bun.file(path.join(fixturesDir, 'index.json')).json();
  if (index.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
    throw new Error(
      `Fixture schemaVersion is ${index.schemaVersion}, expected ${EXPECTED_SCHEMA_VERSION}. ` +
        `The fixture format changed upstream; update test/conformance before bumping the tag.`
    );
  }

  console.log(
    `Fetched conformance fixtures from ${CONFORMANCE_TAG} ` +
      `(core ${index.generator.version}, schema ${index.schemaVersion}): ` +
      `${index.counts.renderedCases} rendered cases, ${index.counts.actionSequences} sequences.`
  );
};

if (import.meta.main) {
  await fetchFixtures();
}
