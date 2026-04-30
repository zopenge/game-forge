# Architecture Rules

## Public API Style

- Prefer public `interface` types plus `createX()` factory functions for package APIs.
- Do not export classes just to group state or methods.
- Export public classes only for clear instance semantics such as custom errors, inheritance extension points, or required `instanceof` checks.
- Keep private state inside closures or internal implementation modules when a factory can hide it.
- Keep package `src/index.ts` files focused on public exports; split large implementation files by responsibility.

## Module Size

- Split files when they mix unrelated responsibilities, not just because a line count looks large.
- Treat files above roughly 250 lines as a review signal for possible extraction.
- Treat files above roughly 400 lines as needing a clear reason to stay together.
- Prefer extracting by responsibility, such as `types`, `registry`, `store`, `catalog`, `loader`, or adapter modules.
- Do not split tightly coupled logic into tiny files that make the execution flow harder to follow.
- Keep package entrypoints small and focused on exports instead of implementation details.

## Callback And Lifecycle Naming

- Use `onXxx(listener)` for event subscription APIs that register listeners and return unsubscribe callbacks.
- Use `onXxx(requestOrEvent)` for passive module lifecycle callbacks invoked by a host.
- Use `requestXxx()` for caller-initiated operations that can be allowed, cancelled, or rejected.
- Keep `handleXxx()` names internal to implementation modules; do not use them as public lifecycle hook names.
- Use `beforeXxx` and `afterXxx` only for strict phase ordering, not for platform-to-game lifecycle requests.
- Use `RuntimeModule.onStopRequested()` for game stop requests; do not introduce public `beforeStop`, `beforeExit`, or `handleStopRequested` hooks.

## Game Session Navigation

- Keep platform navigation controls in the game-client shell, not in game cartridges.
- Do not make game session navigation overlays permanently obscure gameplay.
- Confirm player-initiated exits in the platform shell before calling `RenderApp.requestStop()`.
- Let cartridges react to exit requests only through `RuntimeModule.onStopRequested()`.

## Graphics Boundary

- Keep renderer packages such as `three` inside `packages/graphics`.
- Do not import renderer packages from apps, game cartridges, tests outside `packages/graphics`, or non-graphics packages.
- Keep `@game-forge/graphics` public API names backend-neutral; do not expose names such as `Three`, `three`, `WebGL`, or renderer vendor names.
- Express cartridge graphics capability as `scene-graph-3d`, not as a renderer implementation name.
- Add new render backends behind `@game-forge/graphics` abstractions instead of exposing them to games.

## Localization Boundary

- Keep production localization text in `translations/*.json` files.
- Do not write production translation catalogs inline in TypeScript source files.
- Use TypeScript only to import translation JSON files, create the catalog, and derive message key types.
- Keep translation JSON files valid UTF-8 with readable Chinese text.
- Do not hand off translation files containing mojibake or replacement characters.

## Resource Boundary

- Keep production resource declarations in `resource-manifests/*.json` files.
- Do not handwrite production `ResourceRecord[]` manifests in TypeScript source files.
- Keep resource manifest records minimal: `key`, `path`, and optional `preload: true`.
- Do not write `kind`, `cache`, `bundle`, `group`, `priority`, or `preload: false` in v1 resource manifests.
- Keep resource files under `assets/` and localization files under `translations/`.
- Convert manifest paths with a bundler-provided URL map when resources are bundled; do not rely on dynamic runtime URL construction for packaged assets.
