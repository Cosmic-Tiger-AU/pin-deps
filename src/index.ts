import chalk from "chalk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const log = console.log;
const err = console.error;

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

const isUnpinned = (version: string): boolean => {
  if (/^(workspace:|git\+|http|npm:)/.test(version)) return false;
  if (/^[\^~><]/.test(version) || version === "*") return true;
  // Bare major ("22") or major.minor ("8.5") are not fully pinned
  return !/^\d+\.\d+\.\d+/.test(version);
};

const requirePnpm10 = (): void => {
  let pnpmVersion = "";
  try {
    pnpmVersion = execSync("pnpm --version", { encoding: "utf-8" }).trim();
  } catch {
    err(
      chalk.red(
        "pnpm is not installed or not executable. Please install pnpm v10.",
      ),
    );
    process.exit(1);
  }

  const major = parseInt(pnpmVersion.split(".")[0], 10);
  if (major !== 10) {
    err(
      chalk.red(
        `pnpm v10 is required, but found v${pnpmVersion}. Please install pnpm >=10 <11.`,
      ),
    );
    process.exit(1);
  }
};

const discoverWorkspace = (): {
  installedVersions: Map<string, string>;
  workspacePackages: Set<string>;
} => {
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
      if (!pkg.name || !pkg.version) continue;

      if (dirPath.includes("node_modules")) {
        // Resolved dependency — store exact version.
        // If multiple versions exist, the last one wins.
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

const detectIndent = (raw: string): string | number => {
  const match = raw.match(/^[ \t]+/m);
  return match ? match[0] : 2;
};

const pinWorkspacePackages = (
  workspacePackages: Set<string>,
  installedVersions: Map<string, string>,
): void => {
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

    for (const deps of depsGroups) {
      for (const [name, version] of Object.entries(deps)) {
        if (!isUnpinned(version)) continue;

        const exact = installedVersions.get(name);
        if (exact) {
          deps[name] = exact;
          log(
            chalk.green(
              `  [${relativePath}] Pinned ${name}: ${version} -> ${exact}`,
            ),
          );
          changed = true;
        } else {
          log(
            chalk.yellow(
              `  [${relativePath}] Could not find exact version for "${name}". Skipping.`,
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
};

const main = () => {
  requirePnpm10();
  const { installedVersions, workspacePackages } = discoverWorkspace();
  pinWorkspacePackages(workspacePackages, installedVersions);
  log(
    chalk.green(
      '\nPinning complete! Run "pnpm install" to update your lockfile.',
    ),
  );
};

main();
