import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import reactNativePlugin from '@react-native/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import eslintComments from 'eslint-plugin-eslint-comments';
import jest from 'eslint-plugin-jest';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import tseslint from 'typescript-eslint';

const rnGlobals = {
  __DEV__: 'writable',
  __dirname: 'readonly',
  __fbBatchedBridgeConfig: 'readonly',
  AbortController: 'readonly',
  Blob: 'writable',
  alert: 'readonly',
  cancelAnimationFrame: 'readonly',
  cancelIdleCallback: 'readonly',
  clearImmediate: 'writable',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  document: 'readonly',
  ErrorUtils: 'readonly',
  escape: 'readonly',
  Event: 'readonly',
  EventTarget: 'readonly',
  exports: 'readonly',
  fetch: 'readonly',
  File: 'writable',
  FileReader: 'readonly',
  FormData: 'readonly',
  global: 'readonly',
  Headers: 'readonly',
  Intl: 'readonly',
  Map: 'writable',
  module: 'readonly',
  navigator: 'readonly',
  process: 'readonly',
  Promise: 'writable',
  requestAnimationFrame: 'writable',
  requestIdleCallback: 'writable',
  require: 'readonly',
  Set: 'writable',
  setImmediate: 'writable',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  queueMicrotask: 'writable',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  WebSocket: 'writable',
  window: 'readonly',
  XMLHttpRequest: 'readonly',
};

export default tseslint.config(
  { ignores: ['node_modules/', 'lib/'] },

  // Base JS rules
  js.configs.recommended,

  // All JS/TS source files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@react-native': reactNativePlugin,
      'eslint-comments': eslintComments,
      prettier,
      react,
      'react-hooks': reactHooks,
      'react-native': fixupPluginRules(reactNative),
    },
    settings: {
      react: { version: 'detect' },
    },
    languageOptions: {
      globals: rnGlobals,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Prettier
      'prettier/prettier': 'error',

      // General
      'no-cond-assign': 'warn',
      'no-const-assign': 'error',
      'no-control-regex': 'warn',
      'no-debugger': 'warn',
      'no-dupe-class-members': 'error',
      'no-dupe-keys': 'error',
      'no-ex-assign': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-func-assign': 'warn',
      'no-invalid-regexp': 'warn',
      'no-unsafe-negation': 'warn',
      'no-obj-calls': 'warn',
      'no-regex-spaces': 'warn',
      'no-sparse-arrays': 'warn',
      'no-unreachable': 'error',
      'use-isnan': 'warn',
      'valid-typeof': 'warn',

      // Best practices
      'dot-notation': 'warn',
      eqeqeq: ['warn', 'allow-null'],
      'no-alert': 'warn',
      'no-caller': 'warn',
      'no-div-regex': 'warn',
      'no-eval': 'error',
      'no-extend-native': 'warn',
      'no-extra-bind': 'warn',
      'no-fallthrough': 'warn',
      'no-implied-eval': 'warn',
      'no-labels': 'warn',
      'no-iterator': 'warn',
      'no-lone-blocks': 'warn',
      'no-new': 'warn',
      'no-new-func': 'error',
      'no-new-wrappers': 'warn',
      'no-octal': 'warn',
      'no-octal-escape': 'warn',
      'no-proto': 'warn',
      'no-return-assign': 'warn',
      'no-script-url': 'warn',
      'no-self-compare': 'warn',
      'no-sequences': 'warn',
      'no-useless-escape': 'warn',
      'no-void': 'warn',
      radix: 'warn',
      yoda: 'warn',

      // Variables
      'no-catch-shadow': 'warn',
      'no-delete-var': 'warn',
      'no-global-assign': 'error',
      'no-label-var': 'warn',
      'no-shadow': 'warn',
      'no-shadow-restricted-names': 'warn',
      'no-undef': 'error',
      'no-undef-init': 'warn',
      'no-unused-vars': ['warn', { vars: 'all', args: 'none', ignoreRestSiblings: true }],

      // Node
      'handle-callback-err': 'warn',
      'no-mixed-requires': 'warn',
      'no-new-require': 'warn',
      'no-path-concat': 'warn',
      'no-restricted-imports': 'warn',

      // eslint-comments
      'eslint-comments/no-aggregating-enable': 'warn',
      'eslint-comments/no-unlimited-disable': 'warn',
      'eslint-comments/no-unused-disable': 'warn',
      'eslint-comments/no-unused-enable': 'warn',

      // Stylistic
      'consistent-this': 'warn',
      'no-array-constructor': 'warn',
      'no-empty-character-class': 'warn',
      'no-new-object': 'warn',

      // React
      'react/display-name': 'off',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'warn',
      'react/jsx-uses-vars': 'warn',
      'react/no-did-mount-set-state': 'warn',
      'react/no-did-update-set-state': 'warn',
      'react/no-string-refs': 'error',
      'react/no-unstable-nested-components': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/self-closing-comp': 'warn',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // React Native
      'react-native/no-inline-styles': 'warn',

      // @react-native plugin
      '@react-native/no-deep-imports': 'warn',
    },
  },

  // TypeScript files
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-unused-vars': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'warn',
      'no-undef': 'off',
    },
  },

  // Test files
  {
    files: ['**/*.{spec,test}.{js,ts,tsx}', '**/__{mocks,tests}__/**/*.{js,ts,tsx}'],
    plugins: { jest },
    languageOptions: {
      globals: jest.environments.globals.globals,
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'warn',
      'jest/no-identical-title': 'warn',
      'jest/valid-expect': 'warn',
      'react-native/no-inline-styles': 'off',
    },
  },
);
