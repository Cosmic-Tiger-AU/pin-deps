# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

`pin-deps` is a CLI tool (`pin-deps`) that pins unpinned dependency versions in pnpm and Bun workspace `package.json` files. It discovers all installed exact versions, then rewrites any range specifiers (`^`, `~`, `>`, `<`, `*`) to exact versions. It handles `dependencies`, `devDependencies`, `optionalDependencies`, and the override fields (`pnpm.overrides`, `overrides`, `resolutions`). `peerDependencies` is deliberately excluded. Workspace protocol, git URLs, and tarballs are left untouched; npm aliases are pinned to the installed version of the aliased package.

The package manager is auto-detected from lockfiles, with a `--pm pnpm|bun` override.

## Commands

```bash
pnpm build        # Compile with tsup → dist/index.js (ESM, Node 20+, with shebang)
pnpm test         # Run the vitest suite
pnpm format       # Prettier-format only changed/untracked files
pnpm format-all   # Prettier-format all source files
```

Tests live in `tests/` and import from `src/`.

## Architecture

- **Entry point**: `src/index.ts` — CLI `main()`, plus re-exports of everything the tests import.
- **`src/detect.ts`**: picks the package manager from lockfiles / `packageManager`, and parses the `--pm` flag.
- **`src/managers/pnpm.ts`** and **`src/managers/bun.ts`**: one backend per package manager. Each exposes `require*()` (version check) and `discoverWorkspace()` returning the shared `Workspace` shape (`src/workspace.ts`). pnpm shells out to `pnpm list --parseable --recursive`; Bun reads the text `bun.lock` instead (`src/managers/bun-lockfile.ts`), whose `workspaces` keys give the workspace directories and whose `packages` entries give resolved versions. `bun.lock` is JSONC, so trailing commas are stripped before parsing. The binary `bun.lockb` is not supported — the user is told to run `bun install --save-text-lockfile`.
- **`src/pin.ts`**: manager-agnostic rewriting of `package.json` files, preserving indentation.
- **`src/version-spec.ts`**: `isUnpinned` and npm-alias parsing.
- **Build**: tsup bundles to `dist/index.js` as ESM with a `#!/usr/bin/env node` shebang; this is what the `bin` field points to.
- **Runtime requirement**: pnpm v10 or newer, or Bun v1 (checked at startup).

## Code style

Prettier config enforces double quotes, 2-space indent, trailing commas, and sorted imports (third-party before local) via `@trivago/prettier-plugin-sort-imports`.
