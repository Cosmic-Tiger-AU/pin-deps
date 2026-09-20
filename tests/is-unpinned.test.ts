import { describe, expect, it } from "vitest";

import { isUnpinned } from "../src/index";

describe("isUnpinned", () => {
  describe("exact versions → false", () => {
    it.each(["1.0.0", "0.0.1", "1.0.0-beta.1", "1.0.0-alpha.0+build.123"])(
      "%s",
      (v) => expect(isUnpinned(v)).toBe(false),
    );
  });

  describe("range specifiers → true", () => {
    it.each(["^1.0.0", "~1.0.0", ">1.0.0", "<1.0.0", "*"])("%s", (v) =>
      expect(isUnpinned(v)).toBe(true),
    );
  });

  describe("bare major/minor → true", () => {
    it.each(["22", "8.5"])("%s", (v) => expect(isUnpinned(v)).toBe(true));
  });

  describe("special protocols → false", () => {
    it.each([
      "workspace:*",
      "workspace:^",
      "workspace:1.0.0",
      "git+https://github.com/x/y.git",
      "http://registry.example.com/pkg.tgz",
      "file:../local-pkg",
      "file:./tarballs/my-pkg.tgz",
    ])("%s", (v) => expect(isUnpinned(v)).toBe(false));
  });

  describe("dist-tags → true (no installed version will match; pinWorkspacePackages skips with a warning)", () => {
    it.each(["latest", "next", "beta", "canary"])("%s", (v) =>
      expect(isUnpinned(v)).toBe(true),
    );
  });

  describe("npm aliases", () => {
    it("exact alias → false", () =>
      expect(isUnpinned("npm:pkg@1.0.0")).toBe(false));

    it("scoped exact alias → false", () =>
      expect(isUnpinned("npm:@scope/pkg@1.0.0")).toBe(false));

    it("alias with caret range → true", () =>
      expect(isUnpinned("npm:pkg@^1.0.0")).toBe(true));

    it("scoped alias with caret range → true", () =>
      expect(isUnpinned("npm:@scope/pkg@^1.0.0")).toBe(true));

    it("malformed alias with no version → false (parseNpmAlias returns null)", () =>
      expect(isUnpinned("npm:@scope/pkg")).toBe(false));
  });
});
