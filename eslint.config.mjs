import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/.wrangler/**', '**/*.d.ts', '**/*.d.ts.map', '**/*.js.map']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-restricted-imports': ['error', {
        paths: [{
          message: 'Renderer packages are implementation details of @game-forge/graphics.',
          name: 'three'
        }]
      }]
    }
  },
  {
    files: ['packages/graphics/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off'
    }
  },
  {
    files: ['packages/graphics/src/index.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        message: '@game-forge/graphics public exports must not expose renderer vendor names.',
        selector: 'ExportAllDeclaration[source.value=/three/i], ExportNamedDeclaration[source.value=/three/i], ExportSpecifier[exported.name=/[Tt]hree/]'
      }]
    }
  },
  {
    files: ['apps/**/src/**/*.ts', 'packages/**/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        message: 'Production localization catalogs must be loaded from translations/*.json files.',
        selector: 'CallExpression[callee.name="createTranslationCatalog"] > ObjectExpression:first-child > Property[key.value="en-US"]'
      }]
    }
  }
);
