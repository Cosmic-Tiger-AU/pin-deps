# pin-deps

Pins unpinned dependency versions across all `package.json` files in a pnpm or Bun workspace.

## Usage

```bash
npx @ctgr/pin-deps
```

Or install globally:

```bash
pnpm add -g @ctgr/pin-deps
pin-deps
```

Run from the root of your workspace. After pinning, update your lockfile (`pnpm install` or `bun install`).

The package manager is detected from the lockfile in the working directory (`pnpm-lock.yaml` / `pnpm-workspace.yaml`, or `bun.lock` / `bun.lockb`), falling back to the `packageManager` field of the root `package.json`. Override it when detection is ambiguous:

```bash
pin-deps --pm bun
pin-deps --pm pnpm
```

## What it does

Rewrites range specifiers (`^`, `~`, `>`, `<`, `*`) to exact versions in `dependencies`, `devDependencies`, `optionalDependencies`, and the override fields (`pnpm.overrides`, `overrides`, `resolutions`). Versions are resolved from what's currently installed in your workspace.

Workspace protocols (`workspace:`, `link:`), git URLs, and tarballs are left untouched. Npm aliases (`npm:pkg@^1.0.0`) are pinned to the installed version of the aliased package. `peerDependencies` is left alone on purpose — ranges are expected there.

## Requirements

- pnpm v10 or newer, or Bun v1
- Dependencies must be installed (`pnpm install` / `bun install`) before running
- On Bun, a text `bun.lock` is required (the default since Bun 1.2). With an older binary `bun.lockb`, run `bun install --save-text-lockfile` first.
