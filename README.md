# game-forge

A TypeScript monorepo for game and tooling experiments built with `pnpm`, `vitest`, and a low-overhead graphics abstraction.
We love games, we can play together, we can make it together, let us do it !

## Quick Start

Install dependencies from the repository root:

```bash
pnpm install
```

Run the main local development stack:

```bash
pnpm dev
```

This starts:

- backend on `http://127.0.0.1:3001`
- game client on `http://127.0.0.1:5173`
- admin panel on `http://127.0.0.1:5174`

The root development runner checks for port conflicts before startup, opens browser pages when services are ready, and lets you stop the whole stack with `Ctrl+C`.

## Documentation

- [docs/index.md](E:\source\game-forge\docs\index.md)
- [docs/project-structure.md](E:\source\game-forge\docs\project-structure.md)
- [docs/development-notes.md](E:\source\game-forge\docs\development-notes.md)
