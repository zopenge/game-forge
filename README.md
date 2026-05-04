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

Local multiplayer rooms are available in the same stack. The game client proxies `/signaling` WebSocket traffic to the local backend, so two browser windows can create and join a Bee Shooter co-op room without Cloudflare, Render, or any hosted service.

## Deployment

The repository includes deployment configuration for Render, Vercel, and an optional Cloudflare Workers edge entrypoint:

- `wrangler.jsonc` deploys `apps/edge` to Cloudflare Workers as an optional edge API entrypoint.
- `render.yaml` deploys the backend, game client, and admin panel together.
- `vercel.json` deploys the game client when a Vercel project is connected to the repository root.
- `apps/game-client/vercel.json` deploys the game client as a Vercel static frontend.
- `apps/admin-panel/vercel.json` deploys the admin panel as a Vercel static frontend.

Use `.env` only for local development. Production values such as backend `JWT_SECRET`, Cloudflare `EDGE_API_KEY`, and frontend `VITE_GAME_FORGE_API_BASE_URL` should be configured in the hosting dashboard, not committed to git. Vercel frontends should point `VITE_GAME_FORGE_API_BASE_URL` at the hosted backend URL.
WeChat Mini Program backend values use `WECHAT_APP_ID` and `WECHAT_APP_SECRET`; keep the app secret only in backend or deployment environment variables.

For the optional Cloudflare Workers edge entrypoint, set the edge API key secret first:

```bash
pnpm wrangler secret put EDGE_API_KEY --config wrangler.jsonc
```

Then deploy from the repository root:

```bash
pnpm deploy:cloudflare:edge
```

Workers do not use `HOST` or `PORT`; those values are only for local Node and Render services. The edge app handles CORS, request normalization, optional API-key or bearer-token shape checks, backend proxying under `/api/*`, and optional production signaling under `/signaling/:roomId`. Local development uses the backend signaling route by default. The edge app must not own core business logic or critical persistent data.

For a Render backend Web Service, create a local import file before configuring the Render `Environment` page:

```bash
pnpm create:render-env
```

This writes `.render.env.local` with backend-only values. The file is ignored by git. If your Render service URL is not `https://game-forge-backend.onrender.com`, set the Vercel frontend variable `VITE_GAME_FORGE_API_BASE_URL` to your actual Render URL and redeploy the frontend.

## Documentation

- [docs/index.md](E:\source\game-forge\docs\index.md)
- [docs/project-structure.md](E:\source\game-forge\docs\project-structure.md)
- [docs/development-notes.md](E:\source\game-forge\docs\development-notes.md)
