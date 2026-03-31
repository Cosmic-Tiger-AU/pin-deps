# pin-deps

Pins unpinned dependency versions across all `package.json` files in a pnpm workspace.

## Usage

```bash
npx @ctgr/pin-deps
```

Or install globally:

```bash
pnpm add -g @ctgr/pin-deps
pin-deps
```

Run from the root of your pnpm workspace. After pinning, update your lockfile:

```bash
pnpm install
```

## What it does

Rewrites range specifiers (`^`, `~`, `>`, `<`, `*`) to exact versions in `dependencies`, `devDependencies`, `optionalDependencies`, and `pnpm.overrides`. Versions are resolved from what's currently installed in your workspace.

Workspace protocols (`workspace:`), git URLs, npm aliases, and tarballs are left untouched.

## Requirements

- pnpm v10
- Dependencies must be installed (`pnpm install`) before running
