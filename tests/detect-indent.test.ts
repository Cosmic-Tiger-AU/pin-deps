import { describe, expect, it } from "vitest";

import { detectIndent } from "../src/index";

describe("detectIndent", () => {
  it("detects 2-space indentation", () => {
    expect(detectIndent('{\n  "a": 1\n}')).toBe("  ");
  });

  it("detects 4-space indentation", () => {
    expect(detectIndent('{\n    "a": 1\n}')).toBe("    ");
  });

  it("detects tab indentation", () => {
    expect(detectIndent('{\n\t"a": 1\n}')).toBe("\t");
  });

  it("returns the number 2 when no indentation is found (single-line JSON)", () => {
    expect(detectIndent('{"a":1}')).toBe(2);
  });
});
