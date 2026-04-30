# Architecture Rules

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
