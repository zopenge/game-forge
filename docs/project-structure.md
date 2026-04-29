# Project Structure

## Overview

`game-forge` is a TypeScript monorepo managed with `pnpm` workspaces. It contains browser applications, shared packages, and repository-level tests.

The project is intentionally split into narrow packages so that runtime behavior, rendering, platform access, and application code stay loosely coupled.

## Top-Level Layout

```text
game-forge/
  apps/
  packages/
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
- Shows the current minimal render path with a rotating mesh

Key files:

- `src/main.ts`: browser entry
- `src/create-game-client-app.ts`: app assembly
- `src/game-module.ts`: minimal scene behavior

### `apps/admin-panel`

Browser admin UI example.

- Uses shared packages instead of directly reaching into browser logic everywhere
- Demonstrates that non-game applications can still live in the same workspace

Key files:

- `src/main.ts`: browser entry
- `src/create-admin-panel-app.ts`: app assembly and markup generation

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

### `packages/input`

Owns minimal input state tracking.

- pressed keys
- pointer position

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
- Rendering abstraction is narrow to avoid unnecessary performance overhead
- Repository rules are kept under `rules/`, not hidden only in chat history
