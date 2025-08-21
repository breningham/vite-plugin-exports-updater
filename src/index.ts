import { type Plugin, loadConfigFromFile } from "vite";
import fs from "node:fs";
import path from "node:path";

interface PackageJson {
  name: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: Record<string, ExportCondition>;
}

type ExportCondition =
  | string
  | {
      import?: string;
      require?: string;
      types?: string;
    }
  | { sass: string };

// --- Helper Functions (from your original script) ---

export async function findPackageDir(): Promise<string> {
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

export async function tryLoadViteConfig(pkgDir: string) {
  try {
    const loaded = await loadConfigFromFile(
      { command: "build", mode: "production" },
      undefined,
      pkgDir
    );
    return loaded?.config;
  } catch (err: unknown) {
    // Vite will log its own error, so we can just warn here.
    console.warn(
      `[exports-updater] Failed to load vite config: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

export function collectEntriesFromDist(
  distPath: string,
  options: PluginOptions
): string[] {
  if (!fs.existsSync(distPath)) return [];
  const entryPointExtensions = options.entryPointExtensions || [
    ".js",
    ".cjs",
    ".mjs",
    ".d.ts",
  ];
  const regex = new RegExp(
    `\.(${entryPointExtensions.map((ext) => ext.slice(1)).join("|")})`
  );
  const files = fs.readdirSync(distPath).filter((f) => regex.test(f));
  const entryNames = [...new Set(files.map((f) => f.replace(regex, "")))];
  return entryNames;
}

export function buildExportsMap(
  entryNames: string[],
  distPath: string,
  pkg: PackageJson,
  options: PluginOptions
): Record<string, ExportCondition | string> {
  const exportsMap: Record<string, ExportCondition | string> = {};

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
  if (options.css !== false) {
    const cssExtensions = options.css?.extensions || [".css"];
    const pkgNameCss = `${path.basename(pkg.name)}.css`;

    const findCssFiles = (dir: string): string[] => {
      const files = fs.readdirSync(dir);
      let cssFiles: string[] = [];
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          cssFiles = cssFiles.concat(findCssFiles(filePath));
        } else if (cssExtensions.some((ext) => file.endsWith(ext))) {
          cssFiles.push(path.relative(distPath, filePath));
        }
      }
      return cssFiles;
    };

    const cssFiles = findCssFiles(distPath);

    // Only generate alias if options.css.alias is not explicitly false
    if (options.css?.alias !== false) {
      const alias = options.css?.alias || "./style.css"; // Use provided alias or default

      if (cssFiles.includes("style.css")) {
        exportsMap[alias] = "./dist/style.css";
      } else if (cssFiles.includes(pkgNameCss)) {
        exportsMap[alias] = `./dist/${pkgNameCss}`;
      } else if (cssFiles.includes("index.css")) {
        exportsMap[alias] = "./dist/index.css";
      }
    }

    // Always add individual CSS files
    for (const file of cssFiles) {
      const key = `./${file.replace(/\\/g, "/")}`;
      const value = `./dist/${file.replace(/\\/g, "/")}`;
      if (file.endsWith(".scss")) {
        exportsMap[key] = {
          sass: value,
        };
      } else {
        exportsMap[key] = value;
      }
    }
  }

  return exportsMap;
}

interface PluginOptions {
  entryPointExtensions?: string[];
  css?:
    | false
    | {
        alias?: string | false;
        extensions?: string[];
      };
}

// --- The Vite Plugin ---

export default function updateExports(options: PluginOptions = {}): Plugin {
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
          entryNames = collectEntriesFromDist(distPath, options);
        }

        if (entryNames.length === 0) {
          console.error("[exports-updater] No entry points found. Aborting.");
          return;
        }

        pkg.exports = buildExportsMap(entryNames, distPath, pkg, options);

        if (pkg.exports["."]) {
          const mainExport = pkg.exports["."];
          if (typeof mainExport !== "string") {
            pkg.main = mainExport.require || pkg.main;
            pkg.module = mainExport.import || pkg.module;
            pkg.types = mainExport.types || pkg.types;
          }
        }

        // Ensure legacy fields are removed if they are null/undefined from the exports map
        if (!pkg.main) delete pkg.main;
        if (!pkg.module) delete pkg.module;
        if (!pkg.types) delete pkg.types;

        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
        console.log(
          `✅ [exports-updater] Successfully updated exports for ${pkg.name}.`
        );
      } catch (error: unknown) {
        console.error(
          `[exports-updater] An error occurred: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
}
