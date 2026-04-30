# Code Quality Rules

## Linting

- `pnpm lint` is a hard gate.
- ESLint warnings are treated as failures.
- Do not merge or hand off code with lint warnings, even if the build passes.

## Verification

- For code changes, run `pnpm lint`, `pnpm typecheck`, and relevant tests before claiming completion.
- If a command fails, report the actual failure instead of assuming the code is acceptable.
- When writing Chinese text, verify the touched files are valid UTF-8 and the Chinese renders correctly.
- Do not hand off files containing mojibake, replacement characters, or corrupted Chinese text.

## Documentation

- When implementation behavior changes, update the relevant docs in the same change.
- When developer commands change, update `README.md` and `docs/development-notes.md`.
- When project structure or package boundaries change, update `docs/project-structure.md`.
- Do not leave stale documentation behind after code changes.

## TypeScript

- Prefer explicit, readable types at public boundaries.
- Use `import type` for type-only imports when possible.
