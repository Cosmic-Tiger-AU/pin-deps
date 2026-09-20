import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pinWorkspacePackages } from "../src/pin";

describe("pinWorkspacePackages override keys", () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "pin-deps-overrides-")),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("pins plain keys in overrides and resolutions, leaving path-scoped ones alone", () => {
    const pkgPath = path.join(root, "package.json");
    fs.writeFileSync(
      pkgPath,
      JSON.stringify(
        {
          name: "root",
          overrides: { "color-name": "^1.1.0", "webpack/braces": "^3.0.0" },
          resolutions: { "@scope/util": "^2.0.0", "**/lodash": "^4.0.0" },
        },
        null,
        2,
      ),
    );

    pinWorkspacePackages(
      new Set([pkgPath]),
      new Map([
        ["color-name", "1.1.4"],
        ["@scope/util", "2.3.4"],
      ]),
    );

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.overrides).toEqual({
      "color-name": "1.1.4",
      "webpack/braces": "^3.0.0",
    });
    expect(pkg.resolutions).toEqual({
      "@scope/util": "2.3.4",
      "**/lodash": "^4.0.0",
    });
  });
});
