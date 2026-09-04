module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect', // 설치된 React 버전을 자동으로 감지
    },
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'off',
    'prettier/prettier': ['error', {}, { usePrettierrc: true }], // Prettier 규칙을 ESLint 오류로 표시
    'react/prop-types': 'off', // TypeScript를 사용하므로 prop-types가 필요 없음
    '@typescript-eslint/explicit-module-boundary-types': 'off', // 함수의 반환 타입을 명시적으로 지정하지 않아도 됨
    '@typescript-eslint/no-explicit-any': 'off',
    'react/react-in-jsx-scope': 'off',
  },
};
