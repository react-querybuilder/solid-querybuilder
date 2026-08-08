/**
 * The Phase 3 SSR gate.
 *
 * Replaces the SolidStart example the original plan called for: `@solidjs/start@2.0.0` is a
 * **Solid 1** release (it depends on `solid-js@^1.9`), and there is no Solid-2 line on any
 * dist-tag, so installing it would drag Solid 1 into the workspace. This hand-rolled consumer
 * preserves the three properties that made the SolidStart gate worth having — it consumes the
 * built `dist` through the real `exports` map, it renders through `renderToString` in a Vite SSR
 * build, and it hydrates in a browser-shaped environment.
 *
 * Two independent halves, with two independent failure modes:
 *
 * 1. **Markup + status.** Fetch `/` and assert 200 plus ~14 structural claims. Do not rely on the
 *    error-string grep alone: under Vue's gate proof the needle did not fire because the error
 *    page suppressed the message, and only the status code caught it. Both are asserted here, and
 *    the server entry deliberately turns a thrown render into a 500 so the status is meaningful.
 * 2. **Hydration.** Load the served HTML into jsdom, run the built client entry, and assert both
 *    that nothing was logged as an error and that the post-hydration DOM still matches the
 *    conformance surface the server sent. This is the check that exercises the `solid` export
 *    condition end to end; it shares no code with the markup assertions, which is what makes it a
 *    separate gate rather than a second opinion.
 *
 * The server is started **programmatically on an ephemeral port**, never by spawning a CLI: a
 * spawned `vite preview` leaves an orphan holding the port and serving a stale build, which
 * silently poisons the next run. That was caught in development in Phase 1 and hit again in
 * Phase 2.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { build } from 'vite';

const exampleRoot = import.meta.dirname;
const clientDir = resolve(exampleRoot, 'dist/client');
const serverEntry = resolve(exampleRoot, 'dist/server/entry-server.js');

const failures: string[] = [];
const check = (ok: boolean, description: string) => {
  if (!ok) failures.push(description);
};

// --- Build both bundles ------------------------------------------------------------------------

const libDist = resolve(exampleRoot, '../../packages/solid-querybuilder/dist');
if (!existsSync(libDist)) {
  console.error("test:ssr FAILED — the library's dist/ is missing; run `bun run build` first.");
  process.exit(1);
}

console.log('building examples/ssr (client + server)…');
await build({ root: exampleRoot, logLevel: 'error', build: { outDir: 'dist/client' } });
await build({
  root: exampleRoot,
  logLevel: 'error',
  build: { ssr: 'src/entry-server.tsx', outDir: 'dist/server' },
});

// --- Serve it ----------------------------------------------------------------------------------

const { render } = (await import(serverEntry)) as {
  render: () => { status: number; html: string };
};

const contentTypes: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];

  if (url !== '/') {
    // `normalize` before joining: the path comes off the wire.
    const file = join(clientDir, normalize(url));
    if (file.startsWith(clientDir) && existsSync(file)) {
      res.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'text/plain' });
      res.end(await readFile(file));
      return;
    }
    res.writeHead(404).end('not found');
    return;
  }

  const { status, html } = render();
  res.writeHead(status, { 'content-type': 'text/html' });
  res.end(html);
});

await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
const { port } = server.address() as AddressInfo;
const origin = `http://127.0.0.1:${port}`;

// --- 1. Markup + status ------------------------------------------------------------------------

const response = await fetch(`${origin}/`);
const html = await response.text();

check(response.status === 200, `GET / returned ${response.status}, expected 200`);

const errorNeedles = [
  'document is not defined',
  'window is not defined',
  'navigator is not defined',
  'localStorage is not defined',
  'ReferenceError',
];
for (const needle of errorNeedles) {
  check(!html.includes(needle), `served HTML contains "${needle}"`);
}

const fragments = [
  'class="queryBuilder"',
  'role="form"',
  'data-dnd="disabled"',
  'data-inlinecombinators="enabled"',
  'data-path="[]"',
  'data-path="[0]"',
  'data-path="[2]"',
  'data-path="[4]"',
  'data-path="[4,0]"',
  'data-testid="rule-group"',
  'data-testid="rule"',
  'data-testid="inline-combinator"',
  // The one control passed through `controlElements`.
  'custom-remove-rule',
  // Server-side `formatQuery(query, 'sql')`, in its HTML-escaped form: Solid's SSR escapes text
  // content, so `'` is `&#39;` and `>` is `&gt;`. Matching the raw SQL here would be a
  // false-negative waiting to happen. [Vue hindsight]
  '(firstName like &#39;Stev&#39;&#39;e%&#39; and age &gt; &#39;28&#39; or ' +
    '(lastName = &#39;Vai&#39; and age &lt; &#39;90&#39;))',
];

for (const fragment of fragments) {
  check(html.includes(fragment), `served HTML is missing ${fragment}`);
}

// --- 2. Hydration ------------------------------------------------------------------------------

/**
 * The conformance surface of a rendered tree: enough of every element to notice a changed
 * attribute, a reordered child, or a dropped control, and nothing that hydration is entitled to
 * rewrite (Solid's hydration keys are ignored on purpose).
 */
const surface = (root: Element): string =>
  [...root.querySelectorAll('*')]
    .map(el => {
      const parts = [
        el.tagName.toLowerCase(),
        el.getAttribute('class') ?? '',
        el.getAttribute('data-testid') ?? '',
        el.getAttribute('data-path') ?? '',
      ];
      if (el instanceof (el.ownerDocument.defaultView!.HTMLInputElement)) parts.push(el.value);
      if (el instanceof (el.ownerDocument.defaultView!.HTMLSelectElement)) parts.push(el.value);
      if (el instanceof (el.ownerDocument.defaultView!.HTMLTextAreaElement)) parts.push(el.value);
      return parts.join('|');
    })
    .join('\n');

const consoleErrors: string[] = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (...args: unknown[]) => consoleErrors.push(args.join(' ')));
virtualConsole.on('warn', (...args: unknown[]) => consoleErrors.push(args.join(' ')));
virtualConsole.on('jsdomError', (error: Error) => consoleErrors.push(String(error)));

// Scripts are NOT run by jsdom. `runScripts: 'dangerously'` looks like the obvious setting and is
// a dead end here: jsdom's vm-based global object trips Bun with
// "Proxy is not allowed in the global prototype chain", and it cannot execute the `type="module"`
// client bundle anyway. Both scripts are therefore run in this process instead — the inline
// hydration script through `new Function`, the module through `import()` — against jsdom's
// globals.
const dom = new JSDOM(html, { url: `${origin}/`, pretendToBeVisual: true, virtualConsole });
const { window } = dom;

// Guarded, not asserted with `!`: on the 500 path there is no `#root`, and a crash here would
// abort the run before the assertion report is printed — turning a precise failure into a stack
// trace. The gate must always be able to say *which* assertions failed.
const serverRoot = window.document.querySelector('#root');
check(serverRoot !== null, 'served HTML has no #root element (did the render throw?)');
const serverSurface = serverRoot ? surface(serverRoot) : '';

// The built client entry is a self-contained ES module, so it is imported into *this* process
// against jsdom's globals rather than executed by jsdom, which cannot run `type="module"`.
const restore = installGlobals(window);
try {
  if (!serverRoot) throw new Error('skipped: nothing to hydrate');
  // `generateHydrationScript()`'s inline script creates `_$HY` and installs the event-delegation
  // shims. Without it the client entry dies on `_$HY.done` long before it could report a
  // mismatch, which would make the hydration half of this gate pass vacuously.
  for (const script of window.document.querySelectorAll('script:not([src])')) {
    new Function('window', 'document', script.textContent ?? '')(window, window.document);
  }
  // The script assigns `_$HY` unqualified, so a sloppy-mode `new Function` body lands it on this
  // process's `globalThis` already — which is where the client bundle reads it. Only mirror from
  // the window if that did not happen; copying unconditionally overwrites it with `undefined`.
  // oxlint-disable-next-line no-underscore-dangle -- Solid's hydration global, named by Solid.
  const hy = globalThis as Record<string, unknown>;
  // oxlint-disable-next-line no-underscore-dangle -- ditto.
  hy._$HY ??= (window as unknown as Record<string, unknown>)._$HY;

  await import(`${resolve(clientDir, 'entry-client.js')}?t=${Date.now()}`);
  // Solid 2 batches: hydration effects land on the next microtask, not synchronously.
  await new Promise(r => setTimeout(r, 50));
} catch (error) {
  consoleErrors.push(`client entry threw: ${String(error)}`);
} finally {
  restore();
}

check(
  consoleErrors.length === 0,
  `hydration logged ${consoleErrors.length} error(s):\n    ${consoleErrors.join('\n    ')}`
);

const clientSurface = serverRoot ? surface(window.document.querySelector('#root')!) : '';
check(
  serverSurface === clientSurface,
  'post-hydration DOM does not match the server-rendered conformance surface:\n' +
    firstDifference(serverSurface, clientSurface)
);

// --- Report ------------------------------------------------------------------------------------

await new Promise<void>((done, reject) =>
  server.close(err => (err ? reject(err) : done()))
);

if (failures.length > 0) {
  console.error(`test:ssr FAILED — ${failures.length} assertion(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`examples/ssr: markup (${fragments.length + errorNeedles.length + 1} assertions) and`);
console.log('examples/ssr: hydration (no errors, surface unchanged) — ok');

// --- helpers -----------------------------------------------------------------------------------

/**
 * Point the process globals the client bundle reads at jsdom's window, and hand back an undo.
 * Anything that survives past `restore()` leaks into the rest of the run.
 */
function installGlobals(jsdomWindow: JSDOM['window']) {
  const keys = [
    'window',
    'document',
    'navigator',
    'location',
    'HTMLElement',
    'Element',
    'Node',
    'Event',
    'CustomEvent',
    'MouseEvent',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'getComputedStyle',
    // Written by the inline hydration script; the client bundle reads it off `globalThis`, which
    // in this process is not jsdom's window.
    '_$HY',
  ] as const;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const key of keys) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: (jsdomWindow as unknown as Record<string, unknown>)[key],
    });
  }
  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };
}

function firstDifference(a: string, b: string): string {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  for (let i = 0; i < Math.max(aLines.length, bLines.length); i++) {
    if (aLines[i] !== bLines[i]) {
      return `    line ${i + 1}\n      server: ${aLines[i] ?? '<missing>'}\n      client: ${
        bLines[i] ?? '<missing>'
      }`;
    }
  }
  return '    (no line differs — lengths differ?)';
}
