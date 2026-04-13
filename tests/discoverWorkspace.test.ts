import { execSync } from "child_process";
import * as fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { discoverWorkspace } from "../src/index";

vi.mock("child_process", () => ({ execSync: vi.fn() }));
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe("discoverWorkspace", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it("classifies workspace paths and node_modules as installed deps", () => {
    vi.mocked(execSync).mockReturnValue(
      "/project\n/project/node_modules/chalk\n" as any,
    );
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(
        JSON.stringify({ name: "@acme/app", version: "1.0.0" }) as any,
      )
      .mockReturnValueOnce(
        JSON.stringify({ name: "chalk", version: "4.1.2" }) as any,
      );

    const { installedVersions, workspacePackages } = discoverWorkspace();

    expect(workspacePackages.has("/project/package.json")).toBe(true);
    expect(installedVersions.get("chalk")).toBe("4.1.2");
  });

  it("skips node_modules entries missing name or version", () => {
    vi.mocked(execSync).mockReturnValue(
      "/project/node_modules/bad-pkg\n" as any,
    );
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ name: "bad-pkg" }) as any, // no version field
    );

    const { installedVersions } = discoverWorkspace();

    expect(installedVersions.size).toBe(0);
  });

  it("skips paths where package.json does not exist", () => {
    vi.mocked(execSync).mockReturnValue("/project\n" as any);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { workspacePackages } = discoverWorkspace();

    expect(workspacePackages.size).toBe(0);
  });

  it("silently skips unparseable package.json files", () => {
    vi.mocked(execSync).mockReturnValue(
      "/project/node_modules/broken\n" as any,
    );
    vi.mocked(fs.readFileSync).mockReturnValue("not valid json {{ }" as any);

    expect(() => discoverWorkspace()).not.toThrow();
  });

  it("uses the last version when a package appears at multiple paths (last-wins)", () => {
    vi.mocked(execSync).mockReturnValue(
      ("/project/node_modules/.pnpm/chalk@3.0.0/node_modules/chalk\n" +
        "/project/node_modules/.pnpm/chalk@4.1.2/node_modules/chalk\n") as any,
    );
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(
        JSON.stringify({ name: "chalk", version: "3.0.0" }) as any,
      )
      .mockReturnValueOnce(
        JSON.stringify({ name: "chalk", version: "4.1.2" }) as any,
      );

    const { installedVersions } = discoverWorkspace();

    expect(installedVersions.get("chalk")).toBe("4.1.2");
  });

  it("ignores blank lines in pnpm output", () => {
    vi.mocked(execSync).mockReturnValue("\n/project\n\n" as any);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ name: "@acme/app", version: "1.0.0" }) as any,
    );

    const { workspacePackages } = discoverWorkspace();

    expect(workspacePackages.size).toBe(1);
  });

  it("exits when pnpm list fails", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("pnpm not found");
    });

    expect(() => discoverWorkspace()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
