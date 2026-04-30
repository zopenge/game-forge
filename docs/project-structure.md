# Project Structure

## Overview

`game-forge` is a TypeScript monorepo managed with `pnpm` workspaces. It contains browser applications, shared packages, repository-level tests, repository scripts, and persistent engineering rules.

The project is intentionally split into narrow packages so that runtime behavior, rendering, wallet integration, platform access, and application code stay loosely coupled.

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
- Uses `@game-forge/graphics` for the current Three.js backend
- Uses `@game-forge/i18n` for localized copy, locale persistence, and runtime switching
- Uses wallet-aware login and lobby flow before entering the current render path
- Shows local game assets and wallet-backed on-chain assets in separate sections

Key files:

- `src/main.ts`: browser entry
- `src/create-game-shell.ts`: login, lobby, wallet flow, and game transition
- `src/create-game-client-app.ts`: in-game app assembly
- `src/game-module.ts`: minimal scene behavior
- `src/wallet-client.ts`: browser wallet integration

### `apps/admin-panel`

Browser admin UI example.

- Uses shared packages instead of directly reaching into browser logic everywhere
- Uses the shared i18n package for localized labels and locale switching
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

This package is the stable boundary between applications and rendering backends.

### `packages/graphics`

Owns rendering backend implementations.

- `ThreeRenderScene`
- `ThreeRenderBackendOptions`
- `createThreeRenderBackend()`

Right now it provides a Three.js backend. The abstraction is intentionally narrow so future renderer swaps do not force a full engine wrapper.

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

### `packages/device`

Owns device and viewport description helpers.

- viewport size
- pixel ratio
- touch-like detection

### `packages/identity`

Owns small identity helpers.

- incremental id generation
- session id generation

### `packages/assets`

Owns asset registration and lookup helpers.

- asset catalog
- asset record lookup

### `packages/platform`

Owns environment-facing platform helpers.

- browser host lookup and creation

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
- Wallet contracts and wallet implementations are separated on purpose
- Rendering abstraction is narrow to avoid unnecessary performance overhead
- Repository rules are kept under `rules/`, not hidden only in chat history
