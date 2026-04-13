import * as fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pinWorkspacePackages } from "../src/index";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockRead = (content: string) =>
  vi.mocked(fs.readFileSync).mockReturnValue(content as any);

describe("pinWorkspacePackages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("pins a caret range in dependencies", () => {
    mockRead(JSON.stringify({ dependencies: { chalk: "^4.0.0" } }, null, 2));

    pinWorkspacePackages(
      new Set(["/project/package.json"]),
      new Map([["chalk", "4.1.2"]]),
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/project/package.json",
      JSON.stringify({ dependencies: { chalk: "4.1.2" } }, null, 2) + "\n",
      "utf-8",
    );
  });

  it("does not write the file when all deps are already pinned", () => {
    mockRead(JSON.stringify({ dependencies: { chalk: "4.1.2" } }, null, 2));

    pinWorkspacePackages(
      new Set(["/project/package.json"]),
      new Map([["chalk", "4.1.2"]]),
    );

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("logs a warning and skips when installed version is not found", () => {
    mockRead(JSON.stringify({ dependencies: { unknown: "^1.0.0" } }, null, 2));

    pinWorkspacePackages(new Set(["/project/package.json"]), new Map());

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("pins devDependencies and optionalDependencies", () => {
    mockRead(
      JSON.stringify(
        {
          devDependencies: { typescript: "^5.0.0" },
          optionalDependencies: { fsevents: "~2.3.0" },
        },
        null,
        2,
      ),
    );

    pinWorkspacePackages(
      new Set(["/project/package.json"]),
      new Map([
        ["typescript", "5.4.2"],
        ["fsevents", "2.3.3"],
      ]),
    );

    const written = JSON.parse(
      (vi.mocked(fs.writeFileSync).mock.calls[0][1] as string).trimEnd(),
    );
    expect(written.devDependencies.typescript).toBe("5.4.2");
    expect(written.optionalDependencies.fsevents).toBe("2.3.3");
  });

  it("pins pnpm.overrides", () => {
    mockRead(
      JSON.stringify({ pnpm: { overrides: { lodash: "^4.0.0" } } }, null, 2),
    );

    pinWorkspacePackages(
      new Set(["/project/package.json"]),
      new Map([["lodash", "4.17.21"]]),
    );

    const written = JSON.parse(
      (vi.mocked(fs.writeFileSync).mock.calls[0][1] as string).trimEnd(),
    );
    expect(written.pnpm.overrides.lodash).toBe("4.17.21");
  });

  it("rewrites npm alias entries to exact aliased version", () => {
    mockRead(
      JSON.stringify(
        { dependencies: { react: "npm:preact@^10.0.0" } },
        null,
        2,
      ),
    );

    pinWorkspacePackages(
      new Set(["/project/package.json"]),
      new Map([["preact", "10.19.3"]]),
    );

    const written = JSON.parse(
      (vi.mocked(fs.writeFileSync).mock.calls[0][1] as string).trimEnd(),
    );
    expect(written.dependencies.react).toBe("npm:preact@10.19.3");
  });

  it("preserves 4-space indentation", () => {
    mockRead('{\n    "dependencies": {\n        "chalk": "^4.0.0"\n    }\n}');

    pinWorkspacePackages(
      new Set(["/project/package.json"]),
      new Map([["chalk", "4.1.2"]]),
    );

    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    expect(written).toMatch(/^ {4}/m);
  });

  it("handles multiple workspace packages independently", () => {
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(
        JSON.stringify({ dependencies: { chalk: "^4.0.0" } }, null, 2) as any,
      )
      .mockReturnValueOnce(
        JSON.stringify(
          { dependencies: { typescript: "^5.0.0" } },
          null,
          2,
        ) as any,
      );

    pinWorkspacePackages(
      new Set(["/pkg-a/package.json", "/pkg-b/package.json"]),
      new Map([
        ["chalk", "4.1.2"],
        ["typescript", "5.4.2"],
      ]),
    );

    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });
});
