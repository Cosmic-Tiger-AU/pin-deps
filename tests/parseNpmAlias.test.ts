import { describe, expect, it } from "vitest";

import { parseNpmAlias } from "../src/index";

describe("parseNpmAlias", () => {
  it("parses a simple package alias", () => {
    expect(parseNpmAlias("npm:pkg@1.0.0")).toEqual({
      packageName: "pkg",
      version: "1.0.0",
    });
  });

  it("parses a scoped package alias", () => {
    expect(parseNpmAlias("npm:@scope/pkg@2.3.4")).toEqual({
      packageName: "@scope/pkg",
      version: "2.3.4",
    });
  });

  it("returns null for scoped package with no version (lastIndexOf('@') === 0)", () => {
    expect(parseNpmAlias("npm:@scope/pkg")).toBeNull();
  });

  it("returns null when version is an empty string", () => {
    expect(parseNpmAlias("npm:pkg@")).toBeNull();
  });

  it("returns null when there is no @ separator at all", () => {
    expect(parseNpmAlias("npm:pkg")).toBeNull();
  });
});
