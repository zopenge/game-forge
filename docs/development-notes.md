# Development Notes

## Core Commands

Run these from the repository root:

```bash
pnpm install
pnpm start
pnpm start:game-client
pnpm start:admin-panel
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For local browser development:

```bash
pnpm dev:game-client
pnpm dev:admin-panel
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

### Build Output

- `dist/` directories are generated build output
- build output should not be used as the source of truth when editing code
- source changes belong in `src/`

### Workspace Imports

- shared package imports use workspace aliases such as `@game-forge/runtime`
- test tooling and TypeScript path aliases are configured at the repository root

### Renderer Boundary

- application code should prefer runtime and graphics boundaries over directly coupling to a renderer everywhere
- if the current Three.js backend needs more capability, expand the narrow abstraction carefully
- do not introduce a thick “universal engine API” unless there is a strong, proven need

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
