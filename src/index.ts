import { type Plugin, loadConfigFromFile } from "vite";
import fs from "node:fs";
import path from "node:path";

// --- Helper Functions (from your original script) ---

async function findPackageDir(): Promise<string> {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find package.json");
}

async function tryLoadViteConfig(pkgDir: string) {
  try {
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      undefined,
      pkgDir,
    );
    return loaded?.config
  } catch (err: any) {
    // Vite will log its own error, so we can just warn here.
    console.warn(
      `[exports-updater] Failed to load vite config: ${err.message}`
    );
    return null;
  }
}

function collectEntriesFromDist(distPath: string): string[] {
  if (!fs.existsSync(distPath)) return [];
  const files = fs
    .readdirSync(distPath)
    .filter((f) => /\.(js|cjs|mjs|d\.ts)$/.test(f));
  const entryNames = [
    ...new Set(files.map((f) => f.replace(/\.(js|cjs|mjs|d\.ts)$/, ""))),
  ];
  return entryNames;
}

function buildExportsMap(entryNames: string[], distPath: string, pkg: any) {
  const exportsMap: Record<string, any> = {};

  // 1. Handle JS/TS entries
  for (const name of entryNames) {
    const key = name === "index" ? "." : `./${name}`;
    const conditions: Record<string, string> = {};

    let jsFileName = `${name}.js`;
    let cjsFileName = `${name}.cjs`;

    if (name === "index" && !fs.existsSync(path.join(distPath, jsFileName))) {
      jsFileName = `${path.basename(pkg.name)}.js`;
      cjsFileName = `${path.basename(pkg.name)}.cjs`;
    }

    if (fs.existsSync(path.join(distPath, jsFileName)))
      conditions.import = `./dist/${jsFileName}`;
    if (fs.existsSync(path.join(distPath, cjsFileName)))
      conditions.require = `./dist/${cjsFileName}`;
    if (fs.existsSync(path.join(distPath, "types", `${name}.d.ts`)))
      conditions.types = `./dist/types/${name}.d.ts`;
    else if (fs.existsSync(path.join(distPath, `${name}.d.ts`)))
      conditions.types = `./dist/${name}.d.ts`;

    if (Object.keys(conditions).length > 0) {
      exportsMap[key] = conditions;
    }
  }

  // 2. Handle CSS entries
  const cssFiles = fs.readdirSync(distPath).filter((f) => f.endsWith(".css"));
  const pkgNameCss = `${path.basename(pkg.name)}.css`;

  if (cssFiles.includes("style.css")) {
    exportsMap["./style.css"] = "./dist/style.css";
  } else if (cssFiles.includes(pkgNameCss)) {
    exportsMap["./style.css"] = `./dist/${pkgNameCss}`;
  } else if (cssFiles.includes("index.css")) {
    exportsMap["./style.css"] = "./dist/index.css";
  }

  for (const file of cssFiles) {
    exportsMap[`./${file}`] = `./dist/${file}`;
  }

  return exportsMap;
}

// --- The Vite Plugin ---

export default function updateExports(): Plugin {
  return {
    name: "vite-plugin-exports-updater",

    // Use the `closeBundle` hook, which runs only once after all builds are complete.
    async closeBundle() {
      console.log(
        "[exports-updater] Running post-build to update package.json..."
      );

      try {
        const pkgDir = await findPackageDir();
        const pkgPath = path.join(pkgDir, "package.json");
        const distPath = path.join(pkgDir, "dist");

        if (!fs.existsSync(pkgPath) || !fs.existsSync(distPath)) {
          console.warn(
            "[exports-updater] Missing package.json or dist/ directory. Aborting."
          );
          return;
        }

        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const viteConfig = await tryLoadViteConfig(pkgDir);

        let entryNames: string[] = [];

        if (viteConfig?.build?.lib) {
          const entryOption = viteConfig?.build?.lib?.entry;

          if (entryOption) {
            if (typeof entryOption === "string") {
              entryNames.push(
                path.basename(entryOption, path.extname(entryOption))
              );
            } else if (Array.isArray(entryOption)) {
              entryNames.push(
                ...entryOption.map((e) => path.basename(e, path.extname(e)))
              );
            } else if (typeof entryOption === "object") {
              entryNames.push(...Object.keys(entryOption));
            }
          }
        }

        if (entryNames.length === 0) {
          console.log(
            "[exports-updater] No lib.entry found in Vite config, falling back to scanning dist/ directory."
          );
          entryNames = collectEntriesFromDist(distPath);
        }

        if (entryNames.length === 0) {
          console.error("[exports-updater] No entry points found. Aborting.");
          return;
        }

        pkg.exports = buildExportsMap(entryNames, distPath, pkg);

        if (pkg.exports["."]) {
          pkg.main = pkg.exports["."].require || pkg.main;
          pkg.module = pkg.exports["."].import || pkg.module;
          pkg.types = pkg.exports["."].types || pkg.types;
        }

        // Ensure legacy fields are removed if they are null/undefined from the exports map
        if (!pkg.main) delete pkg.main;
        if (!pkg.module) delete pkg.module;
        if (!pkg.types) delete pkg.types;

        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
        console.log(
          `✅ [exports-updater] Successfully updated exports for ${pkg.name}.`
        );
      } catch (error: any) {
        console.error(`[exports-updater] An error occurred: ${error.message}`);
      }
    },
  };
}
