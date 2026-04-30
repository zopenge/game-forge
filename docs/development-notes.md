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
- generic resource loading uses `@game-forge/resources`
- shared bundled resources use `@game-forge/shared-resources`
- localization primitives use the shared `@game-forge/i18n` workspace package with external `translations/*.json` files
- game cartridges use `@game-forge/game-cartridge`; concrete built-in games live under `packages/games/*`
- wallet packages use aliases such as `@game-forge/wallet-core` and `@game-forge/wallet-evm`
- test tooling and TypeScript path aliases are configured at the repository root

### Localized UI Copy

- user-facing page copy belongs in `translations/*.json` files, not inline inside page templates or flow control
- browser apps currently share the `game-forge.locale` storage key for persisted locale choice
- new localized views should prefer semantic translation keys over English source strings
- each game cartridge should provide its own `translations/en-US.json` and `translations/zh-CN.json` files and receive the active locale through `GameCartridgeContext`
- translation JSON files must stay valid UTF-8 and readable because they are intended to be handed to translators

### Game Cartridges

- the SDK package is `packages/game-cartridge` with package name `@game-forge/game-cartridge`
- concrete built-in game packages live under `packages/games/*`
- cartridges should declare capabilities for graphics, input, and future networking
- cartridges should declare private resources with keys prefixed by the cartridge id
- cartridge-private resource files belong under `packages/games/<game-id>/assets/`
- cartridge code should read resources through `GameCartridgeContext.resources`
- v1 networking is only a reserved service location; cartridges should not implement WebRTC or matchmaking directly

### Resource Loading

- `@game-forge/resources` owns `ResourceManager` and generic resource loading for image, audio, JSON, text, and binary files
- resource keys should be namespaced, such as `shared.ui-click` or `bee-shooter.projectile-config`
- shared resources belong in `packages/shared-resources`, not inside a game package
- declare bundled resources in `resource-manifests/*.json`; TypeScript should import manifests instead of hand-writing resource record arrays
- v1 resource loading is renderer-agnostic; renderer-specific textures and models should be loaded behind graphics adapters from resolved URIs
- launch-critical resources should set `preload: true`; on-demand resources should omit `preload`
- resource manifest records should contain only `key`, `path`, and optional `preload: true`

### Renderer Boundary

- application code must use runtime and graphics boundaries instead of directly coupling to a renderer
- if the current graphics backend needs more capability, expand the narrow abstraction carefully
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
