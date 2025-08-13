# vite-plugin-exports-updater

A Vite plugin that automatically updates your package.json exports map after a build.

## Installation

```bash
pnpm add -D vite-plugin-exports-updater
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import exportsUpdater from "vite-plugin-exports-updater";

export default defineConfig({
  plugins: [exportsUpdater()],
});
```

Now, when you run `vite build`, the plugin will automatically update the `exports` map in your `package.json` to reflect the generated files in your `dist` directory.

## Configuration

You can pass an options object to the `exportsUpdater` plugin to customize its behavior.

```typescript
import { defineConfig } from "vite";
import exportsUpdater from "vite-plugin-exports-updater";

export default defineConfig({
  plugins: [
    exportsUpdater({
      // To disable CSS handling completely
      // css: false,

      // To customize CSS handling
      css: {
        alias: "./style.css", // default: './style.css' - The alias for the main CSS file. Set to `false` to disable the alias.
      },
    }),
  ],
});
```

### CSS Options

- `css`: `false | { alias?: string | false }` (default: `{ alias: './style.css' }`)
  - To disable CSS handling entirely, set this option to `false`.
  - To configure CSS handling, provide an object.
- `css.alias`: `string | false` (default: `'./style.css'`)
  - Specifies the alias for the main CSS entry point.
  - If a `string` is provided (e.g., `'./my-styles.css'`), the plugin will use that string as the alias (e.g., `exports['./my-styles.css']`).
  - If set to `false`, the plugin will _not_ generate an alias for the main CSS file (e.g., `exports['./style.css']` will not be present), but individual CSS files (e.g., `exports['./dist/style.css']`) will still be added if they exist.
