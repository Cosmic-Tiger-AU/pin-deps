import chalk from "chalk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

import { err, log } from "../log";
import type { Workspace } from "../workspace";
import { parseBunLockfile } from "./bun-lockfile";

export const requireBun = (): void => {
  let bunVersion = "";
  try {
    bunVersion = execSync("bun --version", { encoding: "utf-8" }).trim();
  } catch {
    err(
      chalk.red(
        "bun is not installed or not executable. Please install bun v1.",
      ),
    );
    process.exit(1);
  }

  const major = parseInt(bunVersion.split(".")[0], 10);
  if (major !== 1) {
    err(
      chalk.red(
        `bun v1 is required, but found v${bunVersion}. Please install bun >=1 <2.`,
      ),
    );
    process.exit(1);
  }
};

export const discoverWorkspace = (): Workspace => {
  log(chalk.cyan("Reading bun.lock..."));

  const root = process.cwd();
  const lockPath = path.join(root, "bun.lock");

  if (!fs.existsSync(lockPath)) {
    err(
      chalk.red(
        fs.existsSync(path.join(root, "bun.lockb"))
          ? 'Only the binary bun.lockb was found. Run "bun install --save-text-lockfile" to generate bun.lock, then re-run.'
          : 'No bun.lock found. Ensure dependencies are installed ("bun install").',
      ),
    );
    process.exit(1);
  }

  let lockfile;
  try {
    lockfile = parseBunLockfile(fs.readFileSync(lockPath, "utf-8"));
  } catch {
    err(chalk.red(`Failed to parse ${lockPath}.`));
    process.exit(1);
  }

  const workspacePackages = new Set<string>();
  for (const workspacePath of lockfile.workspacePaths) {
    const pkgJsonPath = path.join(root, workspacePath, "package.json");
    if (fs.existsSync(pkgJsonPath)) workspacePackages.add(pkgJsonPath);
  }

  log(
    chalk.cyan(
      `Discovered ${workspacePackages.size} workspace packages and ${lockfile.installedVersions.size} installed dependencies.`,
    ),
  );

  return {
    installedVersions: lockfile.installedVersions,
    workspacePackages,
  };
};
