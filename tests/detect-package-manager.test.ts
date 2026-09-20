import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { detectPackageManager, parsePackageManagerFlag } from "../src/index";

describe("detectPackageManager", () => {
  let root: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const write = (file: string, contents = "") =>
    fs.writeFileSync(path.join(root, file), contents);

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "pin-deps-detect-"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("detects pnpm from pnpm-lock.yaml", () => {
    write("pnpm-lock.yaml");
    expect(detectPackageManager(root)).toBe("pnpm");
  });

  it("detects pnpm from pnpm-workspace.yaml", () => {
    write("pnpm-workspace.yaml");
    expect(detectPackageManager(root)).toBe("pnpm");
  });

  it("detects bun from bun.lock", () => {
    write("bun.lock");
    expect(detectPackageManager(root)).toBe("bun");
  });

  it("detects bun from the legacy binary bun.lockb", () => {
    write("bun.lockb");
    expect(detectPackageManager(root)).toBe("bun");
  });

  it("falls back to the packageManager field when no lockfile exists", () => {
    write("package.json", JSON.stringify({ packageManager: "bun@1.4.2" }));
    expect(detectPackageManager(root)).toBe("bun");
  });

  it("uses the packageManager field to break a two-lockfile tie", () => {
    write("bun.lock");
    write("pnpm-lock.yaml");
    write("package.json", JSON.stringify({ packageManager: "pnpm@11.17.0" }));
    expect(detectPackageManager(root)).toBe("pnpm");
  });

  it("exits when both lockfiles exist and nothing breaks the tie", () => {
    write("bun.lock");
    write("pnpm-lock.yaml");
    expect(() => detectPackageManager(root)).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when no lockfile and no packageManager field exist", () => {
    expect(() => detectPackageManager(root)).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("parsePackageManagerFlag", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("reads --pm <name>", () => {
    expect(parsePackageManagerFlag(["--pm", "bun"])).toBe("bun");
  });

  it("reads --pm=<name>", () => {
    expect(parsePackageManagerFlag(["--pm=pnpm"])).toBe("pnpm");
  });

  it("exits on an unknown package manager", () => {
    expect(() => parsePackageManagerFlag(["--pm", "yarn"])).toThrow(
      "process.exit",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when --pm is given without a value", () => {
    expect(() => parsePackageManagerFlag(["--pm"])).toThrow("process.exit");
  });
});
