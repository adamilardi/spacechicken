/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier'],
  globals: {
    Phaser: 'readonly',
  },
  rules: {
    // Game code (especially Phaser scenes and large rendering methods) legitimately has long functions.
    'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],

    // Prefer const where possible
    'prefer-const': 'warn',

    // Allow console in a game (useful for debugging audio/input)
    'no-console': 'off',

    // Common in Phaser callback-heavy code; underscore prefix for intentionally unused
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // Game loops + complex input/hazard systems often exceed moderate complexity.
    // We still warn so developers are aware, but 25-30 is acceptable here.
    complexity: ['warn', 25],

    // Prettier handles formatting
    'prettier/prettier': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'archive/',
    'dist/',
  ],
};
