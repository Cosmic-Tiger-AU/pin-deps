# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

`pin-deps` is a CLI tool (`pin-deps`) that pins unpinned dependency versions in pnpm workspace `package.json` files. It runs `pnpm list --parseable --recursive` to discover all installed exact versions, then rewrites any range specifiers (`^`, `~`, `>`, `<`, `*`) to exact versions. It handles `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`, and `pnpm.overrides`. Workspace protocol, git URLs, npm aliases, and tarballs are left untouched.

## Commands

```bash
pnpm build        # Compile with tsup → dist/index.js (ESM, Node 18+, with shebang)
pnpm format       # Prettier-format only changed/untracked files
pnpm format-all   # Prettier-format all source files
```

There are no tests. The tool is a single file: `src/index.ts`.

## Architecture

- **Entry point**: `src/index.ts` — the entire implementation is in `main()`.
- **Build**: tsup bundles to `dist/index.js` as ESM with a `#!/usr/bin/env node` shebang; this is what the `bin` field points to.
- **Runtime requirement**: pnpm v10 exactly (checked at startup).

## Code style

Prettier config enforces double quotes, 2-space indent, trailing commas, and sorted imports (third-party before local) via `@trivago/prettier-plugin-sort-imports`.
