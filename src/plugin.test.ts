import { describe, it, expect, vi, beforeEach } from "vitest";
import updateExports from "./index";
import fs from "node:fs";
import { globSync } from "glob";
import { loadConfigFromFile } from "vite";

vi.mock("node:fs");
vi.mock("glob");
vi.mock("vite", async (importOriginal) => {
  const original = await importOriginal<typeof import("vite")>();
  return {
    ...original,
    loadConfigFromFile: vi.fn(),
  };
});

describe("vite-plugin-exports-updater", () => {
  it("should update package.json on closeBundle", async () => {
    const plugin = updateExports();
    const closeBundle = plugin.closeBundle;

    vi.spyOn(process, "cwd").mockReturnValue("/path/to/project");
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      if (p === "/path/to/project/package.json") return true;
      if (p === "/path/to/project/dist") return true;
      if (p === "/path/to/project/dist/index.js") return true;
      if (p === "/path/to/project/dist/index.d.ts") return true;
      return false;
    });
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({ name: "my-pkg" })
    );
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    vi.spyOn(fs, "readdirSync").mockReturnValue([
      "index.js",
      "index.d.ts",
    ] as any);
    vi.spyOn(fs, "statSync").mockReturnValue({
      isDirectory: () => false,
    } as any);

    // Mock loadConfigFromFile to return a config without named entries
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      path: "/path/to/project/vite.config.ts",
      config: { build: { lib: { entry: "src/index.ts" } } },
      dependencies: [],
    });

    if (typeof closeBundle === "function") {
      await closeBundle.call(undefined);
    }

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/path/to/project/package.json",
      JSON.stringify(
        {
          name: "my-pkg",
          exports: {
            ".": {
              import: "./dist/index.js",
              types: "./dist/index.d.ts",
            },
          },
          module: "./dist/index.js",
          types: "./dist/index.d.ts",
        },
        null,
        2
      ) + "\n"
    );
  });
});

describe("vite-plugin-exports-updater with component exports", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // --- Mock CWD and package.json ---
    vi.spyOn(process, "cwd").mockReturnValue("/path/to/project");
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({ name: "my-component-lib" })
    );
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    // --- Mock Vite Config ---
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      path: "/path/to/project/vite.config.ts",
      config: {
        build: {
          lib: {
            entry: {
              button: "lib/button/index.ts",
              card: "lib/card/index.ts",
              "css-module-component": "lib/css-module-component/index.ts",
            },
          },
        },
      },
      dependencies: [],
    });

    // --- Mock File System ---
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      const pathStr = p.toString();
      // Assume package.json and dist folder always exist
      if (pathStr.endsWith("package.json")) return true;
      if (pathStr.endsWith("dist")) return true;

      // CJS builds exist
      if (
        [
          "dist/button.cjs",
          "dist/card.cjs",
          "dist/css-module-component.cjs",
        ].some((file) => pathStr.endsWith(file))
      )
        return true;

      // Type files for button component (for handleTypes test)
      if (pathStr.endsWith("dist/types/button.d.ts")) return true;

      return false;
    });

    // --- Mock Glob ---
    vi.mocked(globSync).mockImplementation((pattern, options) => {
      const cwd = options?.cwd?.toString() || "";
      const ignorePatterns = options?.ignore || [];
      let files: string[] = [];

      if (cwd.endsWith("lib/button")) {
        files = ["_button.scss"];
      } else if (cwd.endsWith("lib/card")) {
        files = ["card.css"];
      } else if (cwd.endsWith("lib/css-module-component")) {
        files = ["component.module.css"];
      }

      // Filter out ignored files
      return files.filter(file => {
        return !ignorePatterns.some(ignorePattern => {
          // Basic glob matching for testing purposes
          const regex = new RegExp(ignorePattern.replace(/\./g, "\\.").replace(/\*/g, ".*"));
          return regex.test(file);
        });
      });
    });
  });

  it("should generate exports with types and sass/style conditions, and direct CSS export", async () => {
    const plugin = updateExports({ handleTypes: true });
    const closeBundle = plugin.closeBundle;

    if (typeof closeBundle === "function") {
      await closeBundle.call(undefined);
    }

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/path/to/project/package.json",
      JSON.stringify(
        {
          name: "my-component-lib",
          exports: {
            "./button": {
              import: "./dist/button.js",
              require: "./dist/button.cjs",
              types: "./dist/types/button.d.ts",
              sass: "lib/button/_button.scss",
            },
            "./card": {
              import: "./dist/card.js",
              require: "./dist/card.cjs",
              style: "lib/card/card.css",
            },
            "./card.css": "lib/card/card.css", // New direct CSS export
            "./css-module-component": {
              import: "./dist/css-module-component.js",
              require: "./dist/css-module-component.cjs",
            },
          },
        },
        null,
        2
      ) + "\n"
    );
  });

  it("should NOT generate types condition if handleTypes is false", async () => {
    const plugin = updateExports({ handleTypes: false }); // Or just updateExports()
    const closeBundle = plugin.closeBundle;

    if (typeof closeBundle === "function") {
      await closeBundle.call(undefined);
    }

    const writtenConfig = JSON.parse(
      vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
    );

    expect(writtenConfig.exports["./button"]).not.toHaveProperty("types");
    expect(writtenConfig.exports["./button"]).toHaveProperty("sass");
  });

  it("should NOT generate style/sass conditions if css is false", async () => {
    const plugin = updateExports({ css: false });
    const closeBundle = plugin.closeBundle;

    if (typeof closeBundle === "function") {
      await closeBundle.call(undefined);
    }

    const writtenConfig = JSON.parse(
      vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
    );

    expect(writtenConfig.exports["./button"]).not.toHaveProperty("sass");
    expect(writtenConfig.exports["./card"]).not.toHaveProperty("style");
  });

  it("should NOT map CSS module files", async () => {
    const plugin = updateExports();
    const closeBundle = plugin.closeBundle;

    if (typeof closeBundle === "function") {
      await closeBundle.call(undefined);
    }

    const writtenConfig = JSON.parse(
      vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
    );

    expect(writtenConfig.exports["./css-module-component"]).not.toHaveProperty(
      "style"
    );
    expect(writtenConfig.exports["./css-module-component"]).not.toHaveProperty(
      "sass"
    );
    expect(writtenConfig.exports).not.toHaveProperty(
      "./css-module-component.css"
    );
  });
});
