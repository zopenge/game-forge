# Engineering Rules

This directory stores persistent repository rules for humans and coding agents.

## Categories

- `rules/code-quality.md`: lint, type safety, verification gates, documentation sync
- `rules/naming.md`: file naming and code identifier naming

## Core Rules

- ESLint must report zero errors and zero warnings.
- TypeScript changes must keep `pnpm typecheck` passing.
- Tests must stay green after code changes.
- Docs must be updated in the same change when implementation, commands, structure, workflow, or public interfaces change.
- New rules should be added to the matching category file, not only mentioned in chat.
