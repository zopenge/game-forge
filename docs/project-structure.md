# Project Structure

## Overview

`game-forge` is a TypeScript monorepo managed with `pnpm` workspaces. It contains browser applications, shared packages, repository-level tests, repository scripts, and persistent engineering rules.

The project is intentionally split into narrow packages so that runtime behavior, rendering, wallet integration, platform access, and application code stay loosely coupled.
Game code is packaged as game cartridges so the browser client can select a game while each game keeps its own source, tests, assets, and `translations/*.json` files.
Package public APIs prefer `interface` types plus `createX()` factories so callers depend on stable contracts while implementation state stays private.

## Top-Level Layout

```text
game-forge/
  apps/
  packages/
  logs/
  scripts/
  tests/
  docs/
  rules/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  tsconfig.json
  vitest.config.ts
  eslint.config.mjs
```

## Applications

### `apps/game-client`

Browser game client example.

- Uses `@game-forge/runtime` for lifecycle and frame flow
- Uses `@game-forge/graphics` for backend-neutral scene graph rendering
- Uses `@game-forge/i18n` with external `translations/*.json` files for localized copy, locale persistence, and runtime switching
- Uses wallet-aware login and lobby flow before entering the current render path
- Shows local game assets and wallet-backed on-chain assets in separate sections
- Lists built-in game cartridges from `src/game-cartridges.ts` and injects player, assets, i18n, and platform services when launching one

Key files:

- `src/main.ts`: browser entry
- `src/create-game-shell.ts`: login, lobby, wallet flow, and game transition
- `src/create-game-client-app.ts`: in-game app assembly
- `src/game-cartridges.ts`: built-in game cartridge registry
- `src/wallet-client.ts`: browser wallet integration

### `apps/admin-panel`

Browser admin UI example.

- Uses shared packages instead of directly reaching into browser logic everywhere
- Uses the shared i18n package with external translation JSON files for localized labels and locale switching
- Demonstrates that non-game applications can still live in the same workspace

Key files:

- `src/main.ts`: browser entry
- `src/create-admin-panel-app.ts`: app assembly and markup generation

### `apps/backend`

Fastify backend for authentication and asset management.

- Supports username login and wallet login
- Issues JWTs for authenticated sessions
- Exposes local game assets and wallet-backed asset views through separate APIs

Key files:

- `src/app.ts`: backend assembly
- `src/routes/`: HTTP routes
- `src/services/`: business logic
- `src/storage/`: in-memory storage

## Shared Packages

### `packages/runtime`

Owns application lifecycle abstractions.

- `RenderApp`
- `RenderBackend`
- `RuntimeModule`
- frame timing and resize handling
- stop-request lifecycle callbacks through `RuntimeModule.onStopRequested()` and `RenderApp.requestStop()`

This package is the stable boundary between applications and rendering backends.

### `packages/graphics`

Owns rendering backend implementations.

- `GraphicsRenderScene`
- `GraphicsRenderBackendOptions`
- `createGraphicsRenderBackend()`

The package owns renderer implementations behind a backend-neutral scene graph API. Public graphics names must not expose the underlying renderer.

### `packages/game-cartridge`

Owns the game cartridge SDK shared by the platform and individual games.

- `GameCartridge`
- `GameCartridgeContext`
- `GameCartridgeRegistry`
- `createGameCartridgeRegistry()`
- game capability declarations for graphics, input, and future networking

The package is singular because it defines the protocol for one cartridge. Concrete games live under `packages/games/*`. Its public entrypoint re-exports focused `types` and `registry` modules.

### `packages/games/bee-shooter`

Small built-in shooter cartridge for testing the cartridge lifecycle.

- Uses the `scene-graph-3d` graphics capability through `@game-forge/graphics`
- Provides localized cartridge metadata through `translations/*.json` and `@game-forge/i18n`
- Declares private resources through `resource-manifests/*.json` and receives a resource manager through cartridge context
- Exercises player movement, projectiles, enemy motion, collision, and scoring behavior

### `packages/games/falling-blocks`

Small built-in falling-blocks cartridge for testing grid-like gameplay.

- Uses the `scene-graph-3d` graphics capability through `@game-forge/graphics`
- Provides localized cartridge metadata through `translations/*.json` and `@game-forge/i18n`
- Declares private resources through `resource-manifests/*.json` and receives a resource manager through cartridge context
- Exercises board state, piece movement, rotation, line clears, and game-over state

### `packages/wallet/core`

Owns chain-agnostic wallet contracts.

- wallet identity types
- wallet challenge and login request types
- wallet asset snapshot types
- browser and server adapter contracts
- wallet registry helpers

### `packages/wallet/evm`

Owns the current EVM wallet implementation.

- MetaMask-compatible browser adapter
- EVM signature verification
- EVM native and ERC20 asset lookup
- mapping EVM results into the shared wallet model

### `packages/input`

Owns minimal input state tracking.

- pressed keys
- pointer position

### `packages/i18n`

Owns shared localization primitives.

- locale detection and fallback
- locale persistence
- translation catalogs and key-shape validation
- runtime translation helpers for browser apps

The public entrypoint re-exports focused `locale`, `catalog`, and `store` modules while preserving factory-style construction through `createTranslationCatalog()` and `createI18nStore()`.

### `packages/device`

Owns device and viewport description helpers.

- viewport size
- pixel ratio
- touch-like detection

### `packages/identity`

Owns small identity helpers.

- incremental id generation
- session id generation

### `packages/resources`

Owns asset registration, resource catalogs, and generic resource loading.

- asset catalog
- asset record lookup
- resource catalog
- `ResourceManager` for image, audio, JSON, text, and binary resources
- preload, memory cache, unload, and load-state tracking

The package stays renderer-agnostic. Renderer-specific texture or model helpers should live behind graphics adapters.

### `packages/shared-resources`

Owns platform-level resources that are reused by more than one cartridge.

- shared resource records
- small bundled placeholder resources
- keys prefixed with `shared.`

### `packages/platform`

Owns environment-facing platform helpers.

- browser host lookup and creation

## Game Cartridge Flow

- `apps/game-client/src/game-cartridges.ts` imports built-in cartridges and registers them with `createGameCartridgeRegistry()`.
- The lobby renders translated cartridge metadata from each cartridge's external translation catalog.
- When the player starts a cartridge, the shell creates `GameCartridgeContext` with player identity, local assets, wallet assets, i18n, resources, and platform services.
- Before launch, the shell merges `@game-forge/shared-resources` records with the selected cartridge's private resources and preloads required resources.
- If resource preload fails, the player stays in the lobby and sees a localized load error.
- During game play, the shell owns transient platform navigation such as return-to-lobby, confirms player-initiated exits, and passes stop requests to the game through `RuntimeModule.onStopRequested()`.
- v1 supports `scene-graph-3d` cartridges through `RuntimeModule<GraphicsRenderScene>`.
- v1 exposes `services.networking.isAvailable === false` as the reserved location for later networking support.

## Game Resources

- Shared resource files live in `packages/shared-resources/assets/` and are declared in `packages/shared-resources/resource-manifests/*.json`.
- Cartridge-private resource files live in `packages/games/<game-id>/assets/` and are declared in `packages/games/<game-id>/resource-manifests/*.json`.
- Resource keys are namespaced, such as `shared.ui-click`, `bee-shooter.projectile-config`, and `falling-blocks.board-config`.
- Cartridges expose resource records on `GameCartridge.resources`, generated from manifest JSON.
- Games access resources through `context.resources`, not by hardcoding platform paths.
- v1 manifest records contain only `key`, `path`, and optional `preload: true`; resource kind is inferred from file extension.
- Bundled packages pass a generated asset URL map into `createResourceRecordsFromManifests()` so manifest paths resolve to packaged URLs instead of dynamic source-relative paths.
- `@game-forge/resources` does not depend on renderer packages; games can pass resolved URLs to graphics abstractions when needed.

## Multiplayer Extension Points

Multiplayer is intentionally not implemented in v1. Future networking work should add shared packages instead of putting transport code inside each game.

- `packages/networking`: shared network session, message protocol, connection state, and reconnect behavior
- `packages/p2p` or `packages/networking/webrtc`: WebRTC signaling, peer connection, and data channel adapters
- `apps/backend/src/routes` and `apps/backend/src/services`: rooms, matchmaking, invitations, and signaling relay
- `GameCartridgeContext.services.networking`: platform-injected API that cartridges use instead of directly depending on WebRTC or backend details

## Game Localization

- Cartridge metadata and game text belong in each cartridge package's `translations/*.json` files.
- Apps and cartridges import translation JSON files into `@game-forge/i18n` for `en-US` and `zh-CN` key validation.
- Do not write production localization text inline in TypeScript source files.
- The platform owns locale selection and injects `context.i18n` into the selected cartridge.
- The game client and cartridges share the active locale so switching language updates the lobby and cartridge metadata together.

## Tests

### `tests/integration`

Cross-package integration tests live here.

These tests check that multiple packages cooperate correctly instead of only verifying one isolated module.

### `tests/e2e`

Browser-shell style tests live here.

These tests validate top-level behavior closer to application entry points.

## Runtime Support Directories

### `logs/`

Stores transient local startup logs.

- logged startup scripts write here
- these files are ignored by git

### `scripts/`

Stores repository-level utility scripts.

- `run-many.mjs`: local multi-service dev runner
- `run-with-log.mjs`: launch one service in the background and write logs to `logs/`

## Supporting Files

### `pnpm-workspace.yaml`

Defines which directories are treated as workspace packages.

### `tsconfig.base.json`

Shared TypeScript compiler settings and workspace path aliases.

### `tsconfig.json`

Root typecheck entry for the repository.

### `vitest.config.ts`

Shared test discovery and alias resolution.

### `eslint.config.mjs`

Root ESLint flat config for TypeScript and repository-wide lint behavior.

### `rules/`

Persistent repository rules for humans and coding agents.

### `docs/`

Human-readable repository documentation, including this file.

## Architectural Notes

- File and directory names use kebab-case
- TypeScript types, interfaces, and classes use PascalCase
- Runtime and rendering are separated on purpose
- Game cartridge protocol and concrete game implementations are separated on purpose
- Wallet contracts and wallet implementations are separated on purpose
- Rendering abstraction is narrow to avoid unnecessary performance overhead
- Resource loading is centralized in `@game-forge/resources` while actual game files stay near their cartridge
- Multiplayer transport should be injected as a platform service rather than implemented separately by each cartridge
- Repository rules are kept under `rules/`, not hidden only in chat history
