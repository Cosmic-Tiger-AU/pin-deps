import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

import { log } from "./log";
import { isUnpinned, parseNpmAlias } from "./version-spec";

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

/**
 * `overrides` and `resolutions` accept path-scoped keys such as
 * "webpack/braces", which select a nested dependency rather than naming a
 * package. There is no single installed version to pin those to, so they are
 * left alone.
 */
const isPackageName = (key: string): boolean =>
  key.startsWith("@")
    ? key.indexOf("/") === key.lastIndexOf("/")
    : !key.includes("/");

export const detectIndent = (raw: string): string | number => {
  const match = raw.match(/^[ \t]+/m);
  return match ? match[0] : 2;
};

export const pinWorkspacePackages = (
  workspacePackages: Set<string>,
  installedVersions: Map<string, string>,
): number => {
  let pinnedCount = 0;

  for (const pkgPath of workspacePackages) {
    const pkgRaw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgRaw);
    const relativePath = path.relative(process.cwd(), pkgPath);

    let changed = false;

    const depsGroups: Record<string, string>[] = DEP_FIELDS.map(
      (f) => pkg[f],
    ).filter(Boolean);

    if (pkg.pnpm?.overrides) {
      depsGroups.push(pkg.pnpm.overrides);
    }

    if (pkg.overrides) {
      depsGroups.push(pkg.overrides);
    }

    if (pkg.resolutions) {
      depsGroups.push(pkg.resolutions);
    }

    for (const deps of depsGroups) {
      for (const [name, version] of Object.entries(deps)) {
        if (!isUnpinned(version)) continue;
        if (!isPackageName(name)) continue;

        const alias = /^npm:/.test(version) ? parseNpmAlias(version) : null;
        const lookupName = alias ? alias.packageName : name;
        const exact = installedVersions.get(lookupName);
        if (exact) {
          const pinned = alias ? `npm:${alias.packageName}@${exact}` : exact;
          deps[name] = pinned;
          log(
            chalk.green(
              `  [${relativePath}] Pinned ${name}: ${version} -> ${pinned}`,
            ),
          );
          changed = true;
          pinnedCount++;
        } else {
          log(
            chalk.yellow(
              `  [${relativePath}] Could not find exact version for "${lookupName}". Skipping.`,
            ),
          );
        }
      }
    }

    if (changed) {
      const indent = detectIndent(pkgRaw);
      fs.writeFileSync(
        pkgPath,
        JSON.stringify(pkg, null, indent) + "\n",
        "utf-8",
      );
    }
  }

  return pinnedCount;
};
