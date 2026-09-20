import { describe, expect, it } from "vitest";

import {
  parseBunLockfile,
  stripTrailingCommas,
} from "../src/managers/bun-lockfile";

const LOCK = `{
  "lockfileVersion": 2,
  "workspaces": {
    "": { "name": "root", "dependencies": { "chalk": "^4.1.0" } },
    "packages/a": { "name": "pkg-a", "version": "1.0.0" },
  },
  "packages": {
    "@scope/util": ["@scope/util@2.3.4", "", {}, "sha512-aaa=="],

    "chalk": ["chalk@4.1.2", "", { "dependencies": { "ms": "^2.1.0" } }, "sha512-bbb=="],

    "ms": ["ms@2.1.3", "", {}, "sha512-ccc=="],

    "chalk/ms": ["ms@1.0.0", "", {}, "sha512-ddd=="],

    "pkg-a": ["pkg-a@workspace:packages/a"],
  }
}`;

describe("stripTrailingCommas", () => {
  it("removes trailing commas before closing braces and brackets", () => {
    expect(stripTrailingCommas('{"a":[1,2,],}')).toBe('{"a":[1,2]}');
  });

  it("leaves commas inside strings alone", () => {
    expect(stripTrailingCommas('{ "a": "x, }" }')).toBe('{ "a": "x, }" }');
  });

  it("leaves escaped quotes alone", () => {
    const raw = '{ "a": "he said \\", }\\"", }';
    expect(JSON.parse(stripTrailingCommas(raw)).a).toBe('he said ", }"');
  });
});

describe("parseBunLockfile", () => {
  it("reads workspace paths, including the root entry", () => {
    expect(parseBunLockfile(LOCK).workspacePaths).toEqual(["", "packages/a"]);
  });

  it("resolves top-level package versions, including scoped ones", () => {
    const { installedVersions } = parseBunLockfile(LOCK);
    expect(installedVersions.get("chalk")).toBe("4.1.2");
    expect(installedVersions.get("@scope/util")).toBe("2.3.4");
  });

  it("prefers the top-level version over a nested, shadowed copy", () => {
    expect(parseBunLockfile(LOCK).installedVersions.get("ms")).toBe("2.1.3");
  });

  it("ignores workspace members, which resolve to workspace:<path>", () => {
    expect(parseBunLockfile(LOCK).installedVersions.has("pkg-a")).toBe(false);
  });

  it("tolerates a lockfile with no packages", () => {
    const { workspacePaths, installedVersions } = parseBunLockfile(
      '{ "workspaces": { "": { "name": "root" } } }',
    );
    expect(workspacePaths).toEqual([""]);
    expect(installedVersions.size).toBe(0);
  });
});

describe("parseBunLockfile npm aliases", () => {
  const ALIAS_LOCK = `{
    "workspaces": { "": { "name": "root" } },
    "packages": {
      "my-ms": ["ms@2.1.3", "", {}, "sha512-aaa=="],
      "my-util": ["@scope/util@2.3.4", "", {}, "sha512-bbb=="],
    }
  }`;

  it("records an aliased entry under the real package name", () => {
    const { installedVersions } = parseBunLockfile(ALIAS_LOCK);
    expect(installedVersions.get("ms")).toBe("2.1.3");
    expect(installedVersions.get("@scope/util")).toBe("2.3.4");
    expect(installedVersions.has("my-ms")).toBe(false);
  });

  it("lets a package keyed under its own name win over an alias", () => {
    const entries = [
      '"ms": ["ms@2.1.3", "", {}, "sha512-aaa=="]',
      '"old-ms": ["ms@1.0.0", "", {}, "sha512-bbb=="]',
    ];

    // The canonical entry wins whichever order the lockfile lists them in.
    for (const ordered of [entries, [...entries].reverse()]) {
      const { installedVersions } = parseBunLockfile(
        `{ "packages": { ${ordered.join(", ")} } }`,
      );
      expect(installedVersions.get("ms")).toBe("2.1.3");
    }
  });

  it("skips nested keys for scoped packages", () => {
    const { installedVersions } = parseBunLockfile(`{
      "packages": {
        "@scope/util": ["@scope/util@2.3.4", "", {}, "sha512-aaa=="],
        "chalk/@scope/util": ["@scope/util@1.0.0", "", {}, "sha512-bbb=="],
      }
    }`);
    expect(installedVersions.get("@scope/util")).toBe("2.3.4");
  });
});
