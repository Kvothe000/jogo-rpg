/* eslint-env node */

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  
  // A SEÇÃO DE CORREÇÃO ESTÁ AQUI
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    // Esta linha aponta para os seus tsconfigs
    project: ['./tsconfig.json', './tsconfig.node.json'],
    
    // Esta é a linha que corrige o erro do monorepo
    tsconfigRootDir: __dirname, 
  },
  
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Desliga a regra que nos estava a incomodar (variáveis não usadas)
    // Vamos confiar no TypeScript para isto.
    '@typescript-eslint/no-unused-vars': 'off',
  },
}