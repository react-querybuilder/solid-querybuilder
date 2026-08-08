/**
 * Server entry. Renders the whole HTML document and returns it with a status code.
 *
 * The status code is deliberate and load-bearing: under Vue's step-8 gate proof the "document is
 * not defined" needle did *not* fire, because the framework's production error page suppressed the
 * message — the failure was caught by the status code alone. A hand-rolled server can make that
 * explicit, so a thrown render error becomes a 500 here and the smoke test asserts 200. Any future
 * change that makes the gate status-blind is a regression.
 */
import { generateHydrationScript, renderToString } from '@solidjs/web';
import { formatQuery } from 'solid-querybuilder';
import { App, query } from './App.jsx';

export interface RenderResult {
  status: number;
  html: string;
}

export const render = (): RenderResult => {
  // Server-side `formatQuery`. Weaker than the API route a meta-framework would give (see
  // `docs/differences-from-react-querybuilder.md`), but it still proves core's formatter runs in a
  // Node process with no DOM globals.
  let sql: string;
  let body: string;

  try {
    sql = formatQuery(query, 'sql');
    // `renderToString` is synchronous in Solid 2.
    body = renderToString(() => <App query={query} />);
  } catch (error) {
    return {
      status: 500,
      html: `<!doctype html><html><body><pre id="ssr-error">${String(
        error instanceof Error ? (error.stack ?? error.message) : error
      )}</pre></body></html>`,
    };
  }

  return {
    status: 200,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>solid-querybuilder SSR example</title>
    <link rel="stylesheet" href="/query-builder.css" />
    ${generateHydrationScript()}
  </head>
  <body>
    <div id="root">${body}</div>
    <pre id="formatted-sql">${escapeHtml(sql)}</pre>
    <script type="module" src="/entry-client.js"></script>
  </body>
</html>`,
  };
};

const escapeHtml = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll(
    "'",
    '&#39;'
  ).replaceAll('"', '&quot;');
