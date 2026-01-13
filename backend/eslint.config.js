import js from '@eslint/js';

export default [
  // Ignore patterns (migrated from .eslintignore)
  {
    ignores: [
      // Dependencies
      'node_modules/',
      // Build outputs
      'dist/',
      'build/',
      'coverage/',
      // Test coverage
      '.nyc_output/',
      // Logs
      '*.log',
      // Environment files
      '.env',
      '.env.*',
      // Database files
      '*.db',
      '*.sqlite',
      '*.sqlite3',
      'prisma/migrations/**/migration.sql.bak',
      // Prisma generated client
      'prisma/generated/',
      // Temporary files
      '*.tmp',
      'tmp/',
      'temp/',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console in backend
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
];
