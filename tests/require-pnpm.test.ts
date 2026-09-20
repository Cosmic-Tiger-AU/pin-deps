import { execSync } from "child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requirePnpm } from "../src/index";

vi.mock("child_process", () => ({ execSync: vi.fn() }));

describe("requirePnpm", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("passes silently for pnpm v10.0.0", () => {
    vi.mocked(execSync).mockReturnValue("10.0.0\n" as any);
    expect(() => requirePnpm()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes silently for pnpm v10.5.2", () => {
    vi.mocked(execSync).mockReturnValue("10.5.2\n" as any);
    expect(() => requirePnpm()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes silently for pnpm v11.0.0", () => {
    vi.mocked(execSync).mockReturnValue("11.0.0\n" as any);
    expect(() => requirePnpm()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes silently for pnpm v11.2.0", () => {
    vi.mocked(execSync).mockReturnValue("11.2.0\n" as any);
    expect(() => requirePnpm()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits for pnpm v9", () => {
    vi.mocked(execSync).mockReturnValue("9.15.0\n" as any);
    expect(() => requirePnpm()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("passes silently for pnpm v12.0.0", () => {
    vi.mocked(execSync).mockReturnValue("12.0.0\n" as any);
    requirePnpm();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits for an unparseable pnpm version", () => {
    vi.mocked(execSync).mockReturnValue("not-a-version\n" as any);
    expect(() => requirePnpm()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when the pnpm binary is not found", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("command not found");
    });
    expect(() => requirePnpm()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
