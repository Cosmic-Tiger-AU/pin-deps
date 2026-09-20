import chalk from "chalk";

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
  pinWorkspacePackages(workspacePackages, installedVersions);
  log(
    chalk.green(
      `\nPinning complete! Run "${backend.install}" to update your lockfile.`,
    ),
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
