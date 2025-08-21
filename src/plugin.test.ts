import { describe, it, expect, vi } from "vitest";
import updateExports from "./index";
import fs from "node:fs";

vi.mock("node:fs");

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
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => false } as any);

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
