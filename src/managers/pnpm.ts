import chalk from "chalk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

import { err, log } from "../log";
import type { Workspace } from "../workspace";

export const requirePnpm = (): void => {
  let pnpmVersion = "";
  try {
    pnpmVersion = execSync("pnpm --version", { encoding: "utf-8" }).trim();
  } catch {
    err(
      chalk.red(
        "pnpm is not installed or not executable. Please install pnpm v10 or newer.",
      ),
    );
    process.exit(1);
  }

  const major = parseInt(pnpmVersion.split(".")[0], 10);
  if (!(major >= 10)) {
    err(
      chalk.red(
        `pnpm v10 or newer is required, but found v${pnpmVersion}. Please upgrade pnpm.`,
      ),
    );
    process.exit(1);
  }
};

export const discoverWorkspace = (): Workspace => {
  log(chalk.cyan('Running "pnpm list --parseable --recursive"...'));

  let pnpmOutput = "";
  try {
    pnpmOutput = execSync("pnpm list --parseable --recursive", {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf-8",
    });
  } catch {
    err(
      chalk.red(
        'Failed to execute pnpm. Ensure dependencies are installed ("pnpm install").',
      ),
    );
    process.exit(1);
  }

  const paths = pnpmOutput
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const installedVersions = new Map<string, string>();
  const workspacePackages = new Set<string>();

  for (const dirPath of paths) {
    const pkgJsonPath = path.join(dirPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

      if (dirPath.includes("node_modules")) {
        if (!pkg.name || !pkg.version) continue;
        // If multiple versions are installed, the last one wins.
        installedVersions.set(pkg.name, pkg.version);
      } else {
        workspacePackages.add(pkgJsonPath);
      }
    } catch {
      // Ignore unparseable package.json files
    }
  }

  log(
    chalk.cyan(
      `Discovered ${workspacePackages.size} workspace packages and ${installedVersions.size} installed dependencies.`,
    ),
  );

  return { installedVersions, workspacePackages };
};
