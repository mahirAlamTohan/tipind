/* eslint-disable import-x/no-named-as-default-member */

import comments from "@eslint-community/eslint-plugin-eslint-comments/configs"
import react from "@eslint-react/eslint-plugin"
import js from "@eslint/js"
import pluginNext from "@next/eslint-plugin-next"
import prettierConfig from "eslint-config-prettier"
import diff from "eslint-plugin-diff"
import eslintPluginImportX from "eslint-plugin-import-x"
import reactCompiler from "eslint-plugin-react-compiler"
import pluginReactHooks from "eslint-plugin-react-hooks"
import regexPlugin from "eslint-plugin-regexp"
import security from "eslint-plugin-security"
import tailwind from "eslint-plugin-tailwindcss"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  // Global ignores
  globalIgnores([
    ".next",
    "out",
    "coverage",
    "playwright-report",
    "test-results",
    "node_modules",
    "scripts/**/*.mjs",
    "scripts/**/*.k6.js",
    "eslint.config.mjs",
    // Next regenerates this file on every dev/build; it references .next/dev
    // type stubs that only exist during `next dev`, which makes
    // import-x/no-unresolved flap between runs.
    "next-env.d.ts",
    // Test runner script, not source code.
    "tests/run-all.mjs",
  ]),

  // Base ESLint + TypeScript
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Import-X
  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,

  // ESLint Comments
  comments.recommended,

  // Regexp
  regexPlugin.configs["flat/recommended"],

  // Security
  security.configs.recommended,

  // Next.js (native flat config)
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
    },
  },

  // React Hooks (native flat config, includes Compiler rules in v6+)
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...pluginReactHooks.configs["recommended-latest"].rules,
    },
  },

  // ESLint React
  react.configs["recommended-type-checked"],

  // Tailwind
  tailwind.configs.recommended,

  // Git Diff
  ...(!process.env.ESLINT_FULL_CHECK ? diff.configs["flat/diff"] : []),

  // Main config block
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-compiler": reactCompiler,
    },
    settings: {
      tailwindcss: {
        cssConfigPath: "./src/styles/main.css",
        callees: ["classnames", "clsx", "ctl", "cn", "cva"],
      },
      react: {
        version: "detect",
      },
    },
    rules: {
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/classnames-order": "off", // Prettier plugin owns ordering
      "tailwindcss/no-custom-classname": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],

      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],

      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],

      "import-x/no-unresolved": ["error", { ignore: ["geist"] }],
      "react-compiler/react-compiler": "error",
    },
  },

  // Service workers run in a Web Worker global scope and are plain JavaScript.
  {
    ...tseslint.configs.disableTypeChecked,
    files: ["public/sw.js"],
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.serviceworker,
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "@eslint-react/no-leaked-conditional-rendering": "off",
    },
  },

  // CJS/CTS files
  {
    files: ["**/*.cjs", "**/*.cts"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },

  // Prettier (must be last)
  prettierConfig,
])
