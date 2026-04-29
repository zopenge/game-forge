# Repository Rules

This repository uses project-local rules that all coding agents must follow before making changes.

## Rule Sources

Read these files in order before editing code:

1. `rules/index.md`
2. Any category files referenced by `rules/index.md`
3. Task-specific user instructions in the current conversation

If two rules conflict, prefer:

1. Direct user instruction
2. More specific rule file
3. `rules/index.md`

## Non-Negotiable

- `pnpm lint` must pass with zero errors and zero warnings.
- Do not consider work complete if ESLint reports any warning.
- Keep file and directory names in kebab-case.
- Keep TypeScript type/interface/class/enum names in PascalCase.
- Keep function names, variable names, object keys, and parameters in camelCase unless an external API requires otherwise.
- Update relevant docs in the same change when implementation behavior, commands, project structure, workflows, or public interfaces change.

## Rule Maintenance

- Add new persistent rules under `rules/` instead of scattering them across unrelated docs.
- Group rules by category.
- Keep rule wording short, imperative, and testable.
