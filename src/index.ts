import chalk from "chalk";
import * as fs from "fs";
import { fileURLToPath } from "url";

import { type PackageManager, parsePackageManagerFlag } from "./detect";
import { log } from "./log";
import * as bun from "./managers/bun";
import * as pnpm from "./managers/pnpm";
import { pinWorkspacePackages } from "./pin";
import type { Workspace } from "./workspace";

export { detectPackageManager, parsePackageManagerFlag } from "./detect";
export type { PackageManager } from "./detect";
export { requireBun } from "./managers/bun";
export { requirePnpm, discoverWorkspace } from "./managers/pnpm";
export { detectIndent, pinWorkspacePackages } from "./pin";
export { isUnpinned, parseNpmAlias } from "./version-spec";
export type { Workspace } from "./workspace";

const BACKENDS: Record<
  PackageManager,
  { require: () => void; discover: () => Workspace; install: string }
> = {
  pnpm: {
    require: pnpm.requirePnpm,
    discover: pnpm.discoverWorkspace,
    install: "pnpm install",
  },
  bun: {
    require: bun.requireBun,
    discover: bun.discoverWorkspace,
    install: "bun install",
  },
};

const main = () => {
  const packageManager = parsePackageManagerFlag(process.argv.slice(2));
  const backend = BACKENDS[packageManager];

  log(chalk.cyan(`Using ${packageManager}.`));

  backend.require();
  const { installedVersions, workspacePackages } = backend.discover();
  const pinnedCount = pinWorkspacePackages(
    workspacePackages,
    installedVersions,
  );

  if (pinnedCount === 0) {
    log(chalk.green("\nAll dependencies are already pinned. Nothing to do."));
    return;
  }

  log(
    chalk.green(
      `\nPinning complete! Run "${backend.install}" to update your lockfile.`,
    ),
  );
};

/** True when run directly, including via a symlinked bin (dlx/bunx/npx). */
const isEntryPoint = (): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
};

if (isEntryPoint()) {
  main();
}
