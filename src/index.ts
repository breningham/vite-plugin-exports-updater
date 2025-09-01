import { type Plugin, type UserConfig, loadConfigFromFile } from "vite";
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

// --- Types ---

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
      style?: string;
      sass?: string;
      development?: string;
    };

interface ComponentPluginOptions {
  handleTypes?: boolean;
  enabledDevelopment?: boolean;
  css?: false;
}

interface FallbackPluginOptions {
  entryPointExtensions?: string[];
  css?:
    | boolean
    | {
        alias?: string | false;
        extensions?: string[];
      };
}

type PluginOptions = ComponentPluginOptions & FallbackPluginOptions;

// --- Helper Functions ---

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

export async function tryLoadViteConfig(
  pkgDir: string
): Promise<UserConfig | null> {
  try {
    const loaded = await loadConfigFromFile(
      { command: "build", mode: "production" },
      undefined,
      pkgDir
    );
    return loaded?.config ?? null;
  } catch (err: unknown) {
    console.warn(
      `[exports-updater] Failed to load vite config: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

// --- New Component-Based Export Builder ---

export function buildComponentExportsFromViteConfig(
  pkgDir: string,
  entry: Record<string, string>,
  options: ComponentPluginOptions
): Record<string, ExportCondition> {
  const exportsMap: Record<string, ExportCondition> = {};

  for (const [name, entryPath] of Object.entries(entry)) {
    const componentDir = path.dirname(entryPath);
    const conditions: ExportCondition = {};

    // Standard import/require from build output
    conditions.import = `./dist/${name}.js`;
    if (fs.existsSync(path.join(pkgDir, "dist", `${name}.cjs`))) {
      conditions.require = `./dist/${name}.cjs`;
    }

    // Types (Opt-in)
    if (options.handleTypes) {
      const typesPath = path.join(pkgDir, "dist", "types", `${name}.d.ts`);
      if (fs.existsSync(typesPath)) {
        conditions.types = `./dist/types/${name}.d.ts`;
      }
    }

    if (options.enabledDevelopment) {
      conditions.development = path.relative(
        pkgDir,
        path.join(entryPath, name)
      );
    }

    // Smart style detection
    if (options.css !== false) {
      const styleFiles = globSync("*.{scss,css}", {
        cwd: componentDir,
        ignore: ["*.module.css", "*.module.scss"],
      });
      for (const file of styleFiles) {
        const ext = path.extname(file);
        const relativePath = `./${path
          .relative(pkgDir, path.join(componentDir, file))
          .replace(/\\/g, "/")}`;
        if (ext === ".scss") {
          conditions.sass = relativePath;
        } else if (ext === ".css") {
          conditions.style = relativePath;
        }
      }
    }

    if (Object.keys(conditions).length > 0) {
      const key = name === "index" ? "." : `./${name}`;
      exportsMap[key] = conditions;
    }

    // Add separate top-level export for CSS files (only if a style condition was added)
    if (typeof conditions.style === "string") {
      exportsMap[`./${name}.css`] = conditions.style;
    }
  }

  return exportsMap;
}

// --- Original Export Builder ---

export function collectEntriesFromDist(
  distPath: string,
  options: FallbackPluginOptions
): string[] {
  if (!fs.existsSync(distPath)) return [];
  const entryPointExtensions = options.entryPointExtensions || [
    ".js",
    ".cjs",
    ".mjs",
  ];
  const regex = new RegExp(
    `\.(${entryPointExtensions.map((ext) => ext.slice(1)).join("|")})`
  );
  const files = fs.readdirSync(distPath).filter((f) => regex.test(f));
  return [...new Set(files.map((f) => f.replace(regex, "")))];
}

export function buildExportsMap(
  entryNames: string[],
  distPath: string,
  pkg: PackageJson,
  options: FallbackPluginOptions
): Record<string, ExportCondition> {
  const exportsMap: Record<string, ExportCondition> = {};

  // 1. Handle JS/TS entries
  for (const name of entryNames) {
    const key = name === "index" ? "." : `./${name}`;
    const conditions: ExportCondition = {};
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

  // 2. Handle CSS entries from dist
  if (options.css !== false) {
    const cssConfig = typeof options.css === "object" ? options.css : {};
    const cssExtensions = cssConfig.extensions || [".css", ".scss"];

    const findCssFiles = (dir: string): string[] => {
      if (!fs.existsSync(dir)) return [];
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

    if (cssConfig.alias !== false) {
      const alias = cssConfig.alias || "./style.css";
      const pkgNameCss = `${path.basename(pkg.name)}.css`;
      if (cssFiles.includes("style.css")) {
        exportsMap[alias] = "./dist/style.css";
      } else if (cssFiles.includes(pkgNameCss)) {
        exportsMap[alias] = `./dist/${pkgNameCss}`;
      }
    }

    for (const file of cssFiles) {
      const key = `./${file.replace(/\\/g, "/")}`;
      const value = `./dist/${file.replace(/\\/g, "/")}`;
      if (file.endsWith(".scss")) {
        exportsMap[key] = { sass: value };
      } else {
        exportsMap[key] = value;
      }
    }
  }

  return exportsMap;
}

// --- The Vite Plugin ---

export default function updateExports(
  options: PluginOptions = { enabledDevelopment: true }
): Plugin {
  return {
    name: "vite-plugin-exports-updater",

    async closeBundle() {
      console.log(
        "[exports-updater] Running post-build to update package.json..."
      );

      try {
        const pkgDir = await findPackageDir();
        const pkgPath = path.join(pkgDir, "package.json");
        if (!fs.existsSync(pkgPath)) {
          console.warn("[exports-updater] Missing package.json. Aborting.");
          return;
        }

        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const viteConfig = await tryLoadViteConfig(pkgDir);

        if (!viteConfig?.build?.lib) {
          throw new Error("Unable to find entry points.");
        }

        const entry = viteConfig?.build?.lib?.entry;

        let exportsMap: Record<string, ExportCondition> = {};

        if (typeof entry === "object" && !Array.isArray(entry)) {
          console.log(
            "[exports-updater] Vite config has named entries, generating component-style exports."
          );
          exportsMap = buildComponentExportsFromViteConfig(
            pkgDir,
            entry,
            options
          );
        } else {
          console.log(
            "[exports-updater] No named entries in Vite config, falling back to default export generation."
          );
          const distPath = path.join(pkgDir, "dist");
          if (!fs.existsSync(distPath)) {
            console.warn(
              "[exports-updater] Missing dist/ directory for fallback mode. Aborting."
            );
            return;
          }

          let entryNames: string[] = [];
          if (entry) {
            if (typeof entry === "string") {
              entryNames.push(path.basename(entry, path.extname(entry)));
            } else if (Array.isArray(entry)) {
              entryNames.push(
                ...entry.map((e) => path.basename(e, path.extname(e)))
              );
            }
          } else {
            entryNames = collectEntriesFromDist(distPath, options);
          }

          if (entryNames.length > 0) {
            exportsMap = buildExportsMap(entryNames, distPath, pkg, options);
          }
        }

        if (Object.keys(exportsMap).length === 0) {
          console.warn(
            "[exports-updater] No entry points found. Nothing to do."
          );
          return;
        }

        pkg.exports = { ...pkg.exports, ...exportsMap };

        if (pkg.exports["."]) {
          const mainExport = pkg.exports["."];
          if (typeof mainExport !== "string") {
            pkg.main = mainExport.require ?? pkg.main;
            pkg.module = mainExport.import ?? pkg.module;
            if (mainExport.types) {
              pkg.types = mainExport.types;
            }
          }
        }

        for (const field of ["main", "module", "types"]) {
          if (!pkg[field as keyof PackageJson]) {
            delete pkg[field as keyof PackageJson];
          }
        }

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
