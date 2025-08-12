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
