import { execSync } from "child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requirePnpm10 } from "../src/index";

vi.mock("child_process", () => ({ execSync: vi.fn() }));

describe("requirePnpm10", () => {
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
    expect(() => requirePnpm10()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes silently for pnpm v10.5.2", () => {
    vi.mocked(execSync).mockReturnValue("10.5.2\n" as any);
    expect(() => requirePnpm10()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits for pnpm v9", () => {
    vi.mocked(execSync).mockReturnValue("9.15.0\n" as any);
    expect(() => requirePnpm10()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits for pnpm v11", () => {
    vi.mocked(execSync).mockReturnValue("11.0.0\n" as any);
    expect(() => requirePnpm10()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when the pnpm binary is not found", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("command not found");
    });
    expect(() => requirePnpm10()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
