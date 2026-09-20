import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { discoverWorkspace } from "../src/managers/bun";

const LOCK = `{
  "lockfileVersion": 2,
  "workspaces": {
    "": { "name": "root" },
    "packages/a": { "name": "pkg-a", "version": "1.0.0" },
    "packages/gone": { "name": "pkg-gone", "version": "1.0.0" },
  },
  "packages": {
    "chalk": ["chalk@4.1.2", "", {}, "sha512-aaa=="],
  }
}`;

describe("bun discoverWorkspace", () => {
  let root: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "pin-deps-bun-")),
    );
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const writePkg = (dir: string) => {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, dir, "package.json"), "{}");
  };

  it("maps lockfile workspace paths to package.json files", () => {
    fs.writeFileSync(path.join(root, "bun.lock"), LOCK);
    writePkg(".");
    writePkg("packages/a");

    const { installedVersions, workspacePackages } = discoverWorkspace();

    // "packages/gone" has no package.json on disk, so it is skipped.
    expect([...workspacePackages].sort()).toEqual(
      [
        path.join(root, "package.json"),
        path.join(root, "packages/a/package.json"),
      ].sort(),
    );
    expect(installedVersions.get("chalk")).toBe("4.1.2");
  });

  it("exits when only the binary bun.lockb is present", () => {
    fs.writeFileSync(path.join(root, "bun.lockb"), "binary");

    expect(() => discoverWorkspace()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when no lockfile is present", () => {
    expect(() => discoverWorkspace()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when the lockfile cannot be parsed", () => {
    fs.writeFileSync(path.join(root, "bun.lock"), "{ not json");

    expect(() => discoverWorkspace()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
