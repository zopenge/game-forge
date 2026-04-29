# Code Quality Rules

## Linting

- `pnpm lint` is a hard gate.
- ESLint warnings are treated as failures.
- Do not merge or hand off code with lint warnings, even if the build passes.

## Verification

- For code changes, run `pnpm lint`, `pnpm typecheck`, and relevant tests before claiming completion.
- If a command fails, report the actual failure instead of assuming the code is acceptable.

## TypeScript

- Prefer explicit, readable types at public boundaries.
- Use `import type` for type-only imports when possible.
