# game-forge

A TypeScript monorepo for game and tooling experiments built with `pnpm`, `vitest`, and a low-overhead graphics abstraction.
We love games, we can play together, we can make it together, let us do it !

## Quick Start

Install dependencies from the repository root:

```bash
pnpm install
```

Create a local environment file from the example:

```bash
cp .env.example .env
```

Run the main local development stack:

```bash
pnpm dev
```

This starts:

- backend on `http://127.0.0.1:3001`
- game client on `http://127.0.0.1:5173`
- admin panel on `http://127.0.0.1:5174`

The root development runner prefers these default ports, automatically moves a service to the next available port when a default is busy, opens browser pages when services are ready, and lets you stop the whole stack with `Ctrl+C`.

## Deployment

The repository includes deployment configuration for Render and Vercel:

- `render.yaml` deploys the backend, game client, and admin panel together.
- `apps/game-client/vercel.json` deploys the game client as a Vercel static frontend.
- `apps/admin-panel/vercel.json` deploys the admin panel as a Vercel static frontend.

Use `.env` only for local development. Production values such as `JWT_SECRET` and `VITE_GAME_FORGE_API_BASE_URL` should be configured in the Render or Vercel dashboard, not committed to git. Vercel frontends should point `VITE_GAME_FORGE_API_BASE_URL` at the hosted backend URL.

## Documentation

- [docs/index.md](E:\source\game-forge\docs\index.md)
- [docs/project-structure.md](E:\source\game-forge\docs\project-structure.md)
- [docs/development-notes.md](E:\source\game-forge\docs\development-notes.md)
