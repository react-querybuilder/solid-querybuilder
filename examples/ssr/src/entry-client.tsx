/**
 * Client entry. Hydrates the server-rendered markup.
 *
 * This is the half that actually exercises the `solid` export condition end to end: if the
 * condition order were wrong, the server would have rendered from the dom-compiled bundle (or
 * failed outright) and hydration here would report a mismatch.
 */
import { hydrate } from '@solidjs/web';
import 'solid-querybuilder/dist/query-builder.css';
import { App, query } from './App.jsx';

hydrate(() => <App query={query} />, document.querySelector('#root')!);
