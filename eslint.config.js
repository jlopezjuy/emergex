// @ts-check
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@angular-eslint': angular,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Disable base rule superseded by @typescript-eslint
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Shared/layout components must use 'emx' prefix
    files: ['src/app/shared/**/*.ts', 'src/app/layout/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@angular-eslint': angular,
    },
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'emx', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'emx', style: 'camelCase' }],
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-negated-async': 'warn',
    },
  },
];
