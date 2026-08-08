# Styling

## The two stylesheets

Both ship in `dist` and are byte-identical to `@react-querybuilder/core`'s — this package compiles
core's own `.scss` sources rather than maintaining a fork of them.

| File                       | Contains                                                        |
| -------------------------- | --------------------------------------------------------------- |
| `query-builder.css`        | Everything: layout **and** the default theme (colors, borders). |
| `query-builder-layout.css` | Structure only — flexbox, spacing, branch lines. No colors.     |

```ts
import 'solid-querybuilder/dist/query-builder.css';
// or, if you are supplying your own theme:
import 'solid-querybuilder/dist/query-builder-layout.css';
```

The `.scss` sources are published alongside the compiled CSS (`query-builder.scss`,
`query-builder-layout.scss`, and the partials under `styles/`).

## Sass: `@use ... with (...)`

Every Sass variable is `!default`, so the whole theme can be reconfigured at compile time:

```scss
@use 'solid-querybuilder/dist/query-builder' with (
  $rqb-spacing: 0.75rem,
  $rqb-base-color: #6d28d9,
  $rqb-border-radius: 0.5rem,
  $rqb-border-style: dashed
);
```

Notable variables: `$rqb-spacing`, `$rqb-border-width`, `$rqb-border-color`, `$rqb-border-style`,
`$rqb-border-radius`, `$rqb-base-color`, `$rqb-background-color`, `$rqb-branch-indent`,
`$rqb-branch-width`, `$rqb-branch-color`, `$rqb-branch-radius`, `$rqb-branch-style`, and
`$rqb-var-prefix` (which renames the custom properties below, if `--rqb-` collides with something).

## Custom properties

The compiled CSS emits its theme as custom properties on `:root`, so most theming needs no Sass at
all — override them anywhere in the cascade:

```
--rqb-spacing              --rqb-base-color         --rqb-branch-indent
--rqb-border-width         --rqb-background-color   --rqb-branch-width
--rqb-border-color         --rqb-border-radius      --rqb-branch-color
--rqb-border-style         --rqb-branch-radius      --rqb-branch-style
```

(The `--rqb-dnd-*` properties also exist, inherited from core. They have no effect here: drag and
drop is a non-goal, and `data-dnd` is always `"disabled"`.)

### A dark theme

```css
@media (prefers-color-scheme: dark) {
  :root {
    --rqb-base-color: #7aa2f7;
    --rqb-background-color: color-mix(in srgb, transparent, var(--rqb-base-color) 15%);
    --rqb-border-color: #414868;
  }
}
```

Scope it to a container instead of `:root` if only part of the page is dark:

```css
.dark .queryBuilder {
  --rqb-base-color: #7aa2f7;
}
```

## Overriding class names

The rendered class names are React Query Builder's, verbatim, so every selector documented there
applies: `.queryBuilder`, `.ruleGroup`, `.ruleGroup-header`, `.ruleGroup-body`, `.rule`,
`.rule-fields`, `.rule-operators`, `.rule-value`, `.betweenRules`, `.dndDragging`, and so on.

To **add** class names rather than restyle the defaults, use `controlClassnames`:

```tsx
<QueryBuilder
  fields={fields}
  defaultQuery={query}
  controlClassnames={{
    queryBuilder: 'my-qb',
    ruleGroup: 'my-group',
    addRule: 'btn btn-sm',
    value: 'form-control',
  }}
/>
```

`controlClassnames` values are merged into the computed class string with core's `clsx`; they do not
replace the standard class names, which is what keeps DOM parity intact. `controlClassnames` can
also be supplied through `QueryBuilderContext` to apply to a whole subtree — see
[`customization.md`](./customization.md).

## Solid-idiomatic overrides: CSS Modules

CSS Modules are the usual Solid answer for scoped styles, and they compose with `controlClassnames`
directly. They are **documented, not shipped** — adding a CSS Modules build to this package would
mean shipping hashed class names, which would break DOM parity, so the wiring stays on your side:

```tsx
import styles from './QueryBuilder.module.css';

<QueryBuilder
  fields={fields}
  defaultQuery={query}
  controlClassnames={{ queryBuilder: styles.queryBuilder, rule: styles.rule }}
/>;
```

The same reasoning applies to any scoped-style mechanism (Tailwind's `@apply`, vanilla-extract, etc.):
supply the generated names through `controlClassnames`, and leave the standard class names alone.
