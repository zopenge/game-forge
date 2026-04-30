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
- It prefers ports `3001`, `5173`, and `5174`, but automatically uses the next available port when a default is busy.
- It passes the selected backend URL into the game client Vite proxy so API routes continue to work after a port fallback.
- It loads root `.env` values for local development before starting managed services.
- It opens browser pages automatically when browser-facing services are ready.
- `Ctrl+C` in the root terminal should stop the managed development stack together.
- Set `GAME_FORGE_OPEN_BROWSER=0` to disable automatic browser opening.

PowerShell example:

```powershell
$env:GAME_FORGE_OPEN_BROWSER='0'; pnpm dev
```

## Environment Variables

- Copy `.env.example` to `.env` for local development.
- Do not commit real `.env` files; `.gitignore` ignores `.env` and `.env.*` while allowing `.env.example`.
- Keep production values such as `JWT_SECRET` and RPC URLs in the Render or Vercel environment-variable dashboard.
- `VITE_GAME_FORGE_API_BASE_URL` tells static frontends where the backend API lives; leave it as `http://127.0.0.1:3001` locally or set it to the hosted backend URL in production.
- `HOST=0.0.0.0` is required for hosted backend services such as Render; local development should keep `HOST=127.0.0.1`.

## Deployment

- `render.yaml` is the full-stack deployment path for the backend, game client, and admin panel.
- `vercel.json` supports a Vercel project connected at the repository root and deploys the game client from `apps/game-client/dist`.
- Additional Vercel configs live in `apps/game-client/vercel.json` and `apps/admin-panel/vercel.json`; they support projects whose root directory is set to the matching app.
- Vercel deployments are static frontends and must point `VITE_GAME_FORGE_API_BASE_URL` to an external backend such as Render for API flows.
- Shared deployment commands live in the root `package.json` as `build:backend`, `build:game-client`, `build:admin-panel`, `create:render-env`, `deploy:build:game-client`, `deploy:build:admin-panel`, and `deploy:start:backend`.
- The current backend uses in-memory storage, so hosted demo data is lost when the service restarts.

### Render Backend Web Service

Use these settings when creating or updating the backend in the Render dashboard:

- Service Type: Web Service
- Repository: `zopenge/game-forge`
- Branch: `main`
- Runtime: Node
- Root Directory: leave blank
- Build Command: `pnpm install --frozen-lockfile && pnpm build:backend`
- Start Command: `pnpm deploy:start:backend`

Generate a local Render env import file from the repository root:

```bash
pnpm create:render-env
```

The command writes `.render.env.local`, which is ignored by git and contains only backend variables:

```dotenv
HOST=0.0.0.0
JWT_SECRET=<random-local-generated-secret>
EVM_RPC_URL=https://ethereum.publicnode.com
DEFAULT_EVM_CHAIN_ID=1
WALLET_AUTH_MESSAGE_PREFIX=Sign this message to access Game Forge.
```

Optional examples:

```bash
pnpm create:render-env -- --service-url https://ai-forge.onrender.com
pnpm create:render-env -- --service-name ai-forge
pnpm create:render-env -- --output .render.ai-forge.env.local
```

Render deployment steps:

1. Create or reuse a Render Web Service.
2. Connect `zopenge/game-forge`.
3. Fill in the build command and start command above.
4. Run `pnpm create:render-env`.
5. Open `Environment` in the Render sidebar.
6. Import or paste the values from `.render.env.local`.
7. Click `Manual Deploy`, then `Clear build cache & deploy`.
8. After deployment, test `POST https://<render-backend-url>/auth/login`.
9. If the Render URL is not `https://game-forge-backend.onrender.com`, update the Vercel `VITE_GAME_FORGE_API_BASE_URL` environment variable to the actual Render URL and redeploy the frontend.

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

### Package API Style

- package public APIs should prefer `interface` types plus `createX()` factory functions
- callers should depend on interfaces such as `ResourceManager`, `I18nStore`, or `GameCartridgeRegistry`
- factories such as `createResourceManager()`, `createI18nStore()`, and `createRenderApp()` own construction and hide private state
- reserve exported classes for clear class semantics, such as custom errors or required `instanceof` checks
- keep `src/index.ts` files focused on exports; move implementation into responsibility-specific modules as files grow

### Callback And Lifecycle Naming

- use `onXxx(listener)` for subscription APIs that return unsubscribe callbacks
- use `onXxx(requestOrEvent)` for passive lifecycle callbacks invoked by a host, such as `RuntimeModule.onStopRequested()`
- use `requestXxx()` for caller-initiated operations that can be cancelled, such as `RenderApp.requestStop()`
- keep `handleXxx()` names internal; do not expose them as public lifecycle hooks
- do not use `beforeStop`, `beforeExit`, or `handleStopRequested` for game session stop callbacks

### Module Size

- large files are a maintainability signal, not an automatic failure
- review files above roughly 250 lines for possible extraction by responsibility
- files above roughly 400 lines should have a clear reason to stay together
- split by concepts such as `types`, `registry`, `store`, `catalog`, `loader`, or adapter boundaries
- avoid over-splitting tightly coupled logic into tiny files that make the flow harder to understand

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
- cartridges should respond to platform session stop requests through `RuntimeModule.onStopRequested()` when they need to save, settle, or cancel exit
- cartridges should not draw platform navigation controls such as the return-to-lobby button or exit confirmation dialog
- the game-client shell owns transient game-session controls and confirms player-initiated exits before calling `RenderApp.requestStop()`
- v1 networking is only a reserved service location; cartridges should not implement WebRTC or matchmaking directly

### Resource Loading

- `@game-forge/resources` owns `ResourceManager` and generic resource loading for image, audio, JSON, text, and binary files
- resource keys should be namespaced, such as `shared.ui-click` or `bee-shooter.projectile-config`
- shared resources belong in `packages/shared-resources`, not inside a game package
- declare bundled resources in `resource-manifests/*.json`; TypeScript should import manifests instead of hand-writing resource record arrays
- bundled package entrypoints should provide a bundler URL map to `createResourceRecordsFromManifests()` so manifest paths become packaged asset URLs
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
