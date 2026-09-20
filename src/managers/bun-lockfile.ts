import type { Workspace } from "../workspace";

/**
 * Strip the trailing commas Bun writes into `bun.lock` so it can be read as
 * JSON. Characters inside strings are left alone.
 */
export const stripTrailingCommas = (raw: string): string => {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];

    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }

    if (char === ",") {
      // Look ahead past whitespace for a closing brace or bracket.
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j])) j++;
      if (raw[j] === "}" || raw[j] === "]") continue;
    }

    out += char;
  }

  return out;
};

/**
 * A top-level `packages` key is a bare package name ("chalk", "@scope/util").
 * Nested keys ("chalk/ms", "chalk/@scope/util") are shadowed copies of a
 * dependency installed at a second version.
 */
const isTopLevelKey = (key: string): boolean =>
  key.startsWith("@")
    ? key.indexOf("/") === key.lastIndexOf("/")
    : !key.includes("/");

/** Split a `name@version` lockfile identifier into its two halves. */
const splitIdentifier = (
  identifier: string,
): { name: string; version: string } | null => {
  const atIdx = identifier.lastIndexOf("@");
  if (atIdx <= 0) return null;
  return {
    name: identifier.slice(0, atIdx),
    version: identifier.slice(atIdx + 1),
  };
};

export type BunLockfile = {
  /** Workspace directories, relative to the lockfile ("" is the root). */
  workspacePaths: string[];
  /** Package name -> resolved version, for top-level (hoisted) entries only. */
  installedVersions: Workspace["installedVersions"];
};

/**
 * Read a text `bun.lock`. Its `workspaces` keys are the workspace directories,
 * and its `packages` entries resolve each dependency to `name@version`.
 */
export const parseBunLockfile = (raw: string): BunLockfile => {
  const lock = JSON.parse(stripTrailingCommas(raw));

  const workspacePaths = Object.keys(lock.workspaces ?? {});
  const installedVersions = new Map<string, string>();
  // Names recorded under their own key, which an aliased entry must not replace.
  const canonical = new Set<string>();

  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const identifier = Array.isArray(entry) ? entry[0] : null;
    if (typeof identifier !== "string") continue;

    // Only the top-level entry is the version everything resolves to by default.
    if (!isTopLevelKey(key)) continue;

    const parsed = splitIdentifier(identifier);
    if (!parsed) continue;

    // Workspace members resolve to "workspace:<path>", not a version.
    if (parsed.version.startsWith("workspace:")) continue;

    // An npm alias is keyed by its local name ("my-ms") and resolves to the
    // real package ("ms@2.1.3"), so record it under the real name.
    const isAlias = key !== parsed.name;
    if (isAlias && canonical.has(parsed.name)) continue;
    if (!isAlias) canonical.add(parsed.name);

    installedVersions.set(parsed.name, parsed.version);
  }

  return { workspacePaths, installedVersions };
};
