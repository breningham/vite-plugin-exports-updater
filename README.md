# vite-plugin-exports-updater

A Vite plugin that automatically updates your package.json exports map after a build.

## Installation

```bash
pnpm add -D vite-plugin-exports-updater
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import exportsUpdater from 'vite-plugin-exports-updater';

export default defineConfig({
  plugins: [
    exportsUpdater(),
  ],
});
```

Now, when you run `vite build`, the plugin will automatically update the `exports` map in your `package.json` to reflect the generated files in your `dist` directory.

## Configuration

You can pass an options object to the `exportsUpdater` plugin to customize its behavior.

```typescript
import { defineConfig } from 'vite';
import exportsUpdater from 'vite-plugin-exports-updater';

export default defineConfig({
  plugins: [
    exportsUpdater({
      css: {
        enabled: true, // default: true - Whether to process CSS files and add them to exports.
        alias: './style.css', // default: './style.css' - The alias for the main CSS file. Set to `false` to disable the alias.
      },
    }),
  ],
});
```

### CSS Options

-   `css.enabled`: `boolean` (default: `true`)
    -   Set to `false` to completely disable the plugin's handling of CSS files. No CSS files will be added to the `exports` map.
-   `css.alias`: `string | false` (default: `'./style.css'`)
    -   Specifies the alias for the main CSS entry point.
    -   If a `string` is provided (e.g., `'./my-styles.css'`), the plugin will use that string as the alias (e.g., `exports['./my-styles.css']`).
    -   If set to `false`, the plugin will *not* generate an alias for the main CSS file (e.g., `exports['./style.css']` will not be present), but individual CSS files (e.g., `exports['./dist/style.css']`) will still be added if they exist.
