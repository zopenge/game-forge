# Development Notes

## Core Commands

Run these from the repository root:

```bash
pnpm install
pnpm dev
pnpm start
pnpm start:backend
pnpm start:game-client
pnpm start:admin-panel
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For focused local development:

```bash
pnpm dev:backend
pnpm dev:game-client
pnpm dev:admin-panel
```

For background startup with dedicated log files:

```bash
pnpm start:backend:logged
pnpm start:game-client:logged
pnpm dev:game-client:logged
```

## Local Development Runner

- `pnpm dev` is the primary local development entrypoint.
- It starts `backend`, `game-client`, and `admin-panel` together.
- It checks ports `3001`, `5173`, and `5174` before starting.
- It opens browser pages automatically when browser-facing services are ready.
- `Ctrl+C` in the root terminal should stop the managed development stack together.
- Set `GAME_FORGE_OPEN_BROWSER=0` to disable automatic browser opening.

PowerShell example:

```powershell
$env:GAME_FORGE_OPEN_BROWSER='0'; pnpm dev
```

## Required Quality Gates

- `pnpm lint` must pass with zero errors and zero warnings
- `pnpm typecheck` must pass
- relevant tests must pass before work is considered complete

The repository currently treats ESLint warnings as failures through the root lint script.

## Naming Rules

- File names: kebab-case
- Directory names: kebab-case
- TypeScript types, interfaces, classes, enums: PascalCase
- Functions, variables, parameters, object property names: camelCase unless an external API requires another shape

## Important Cautions

### Documentation Sync

- If implementation behavior, project structure, commands, workflows, or public interfaces change, update the relevant docs in the same change.
- Do not leave repository documentation describing an older implementation after code has already changed.

### Build Output

- `dist/` directories are generated build output
- build output should not be used as the source of truth when editing code
- source changes belong in `src/`

### Workspace Imports

- shared package imports use workspace aliases such as `@game-forge/runtime`
- wallet packages use aliases such as `@game-forge/wallet-core` and `@game-forge/wallet-evm`
- test tooling and TypeScript path aliases are configured at the repository root

### Renderer Boundary

- application code should prefer runtime and graphics boundaries over directly coupling to a renderer everywhere
- if the current Three.js backend needs more capability, expand the narrow abstraction carefully
- do not introduce a thick universal engine API unless there is a strong, proven need

### Logs And Scripts

- transient startup logs belong under `logs/`, not at the repository root
- shared repository automation should prefer cross-platform Node scripts under `scripts/` over shell-specific one-off scripts when practical

## Rules And Collaboration

Repository rules live here:

- `AGENTS.md`
- `rules/index.md`
- `rules/code-quality.md`
- `rules/naming.md`

Add new persistent rules to `rules/` and keep them grouped by category so they remain easy to maintain.

## Suggested Workflow

1. Read `AGENTS.md` and the relevant files under `rules/`
2. Make changes in `src/` and matching tests
3. Run `pnpm lint`
4. Run `pnpm typecheck`
5. Run `pnpm test`
6. Run `pnpm build` when the change affects packaging or browser output
7. Update docs when commands, behavior, structure, or public interfaces change
