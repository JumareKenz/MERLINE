// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },

  // ─── PHASE 0: legacy boundary ───
  // In-editor feedback for the rule that `legacy-boundary.spec.ts` enforces in
  // CI. Legacy modules are deregistered from app.module.ts but still on disk,
  // so nothing stops an import except this rule and that test.
  //
  // The boundary is ONE-WAY: legacy code may import shared foundations; active
  // code may not import legacy. Keep the pattern list in step with
  // `src/common/architecture/legacy-registry.ts`.
  {
    ignores: [
      'src/assignments/**',
      'src/dashboards/**',
      'src/indicators/**',
      'src/logframes/**',
      'src/questionnaires/**',
      'src/reports/**',
      'src/studies/**',
      'src/submissions/**',
      'src/sync/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/assignments/*',
                '**/dashboards/*',
                '**/indicators/*',
                '**/logframes/*',
                '**/questionnaires/*',
                '**/reports/*',
                '**/studies/*',
                '**/submissions/*',
                '**/sync/*',
              ],
              message:
                'Legacy MERL module (Phase 0). Active qualitative code must not import it. See LEGACY.md.',
            },
          ],
        },
      ],
    },
  },
);
