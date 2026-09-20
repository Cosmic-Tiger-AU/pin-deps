import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

import { err } from "./log";

export const PACKAGE_MANAGERS = ["pnpm", "bun"] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const LOCKFILES: Record<PackageManager, string[]> = {
  pnpm: ["pnpm-lock.yaml", "pnpm-workspace.yaml"],
  bun: ["bun.lock", "bun.lockb"],
};

export const isPackageManager = (value: string): value is PackageManager =>
  (PACKAGE_MANAGERS as readonly string[]).includes(value);

/** Read `--pm <name>` (or `--pm=<name>`) from CLI arguments. */
export const parsePackageManagerFlag = (argv: string[]): PackageManager => {
  const index = argv.findIndex(
    (arg) => arg === "--pm" || arg.startsWith("--pm="),
  );
  if (index === -1) return detectPackageManager(process.cwd());

  const arg = argv[index];
  const value = arg.includes("=")
    ? arg.slice(arg.indexOf("=") + 1)
    : argv[index + 1];

  if (!value || !isPackageManager(value)) {
    err(
      chalk.red(
        `Unknown package manager "${value ?? ""}". Use --pm ${PACKAGE_MANAGERS.join(" or --pm ")}.`,
      ),
    );
    process.exit(1);
  }

  return value;
};

/**
 * Pick a package manager from the lockfiles present in `root`, falling back to
 * the `packageManager` field of the root package.json.
 */
export const detectPackageManager = (root: string): PackageManager => {
  const found = PACKAGE_MANAGERS.filter((pm) =>
    LOCKFILES[pm].some((file) => fs.existsSync(path.join(root, file))),
  );

  if (found.length === 1) return found[0];

  const declared = readDeclaredPackageManager(root);
  if (declared && (found.length === 0 || found.includes(declared))) {
    return declared;
  }

  if (found.length > 1) {
    err(
      chalk.red(
        `Found lockfiles for both ${found.join(" and ")}. Re-run with --pm ${found.join(" or --pm ")}.`,
      ),
    );
    process.exit(1);
  }

  err(
    chalk.red(
      `No pnpm or bun lockfile found in ${root}. Run this from your workspace root, or pass --pm ${PACKAGE_MANAGERS.join(" or --pm ")}.`,
    ),
  );
  process.exit(1);
};

const readDeclaredPackageManager = (root: string): PackageManager | null => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf-8"),
    );
    const name = String(pkg.packageManager ?? "").split("@")[0];
    return isPackageManager(name) ? name : null;
  } catch {
    return null;
  }
};
