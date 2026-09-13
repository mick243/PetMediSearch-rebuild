/*
 * 서버 린트 설정.
 *
 * 서버에는 린트가 없었습니다. 그래서 "부르는데 가져오지 않은 식별자" 같은
 * 오류가 그대로 커밋됐습니다 — logError 를 require 하지 않은 채 쓰는 코드가
 * 두 파일에 있었고, 오류 경로에서만 도는 자리라 DB 가 끊긴 순간에야
 * ReferenceError 로 프로세스가 죽었습니다.
 *
 * no-undef 하나만으로 그 부류는 전부 잡힙니다.
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2023: true,
  },
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'script', // CommonJS (require/module.exports)
  },
  extends: ['eslint:recommended'],
  rules: {
    /*
     * 쓰지 않는 변수. 다만 콜백에서 앞 인자만 쓰려고 뒤를 비워 두는 일이 흔해
     * (error, results) 처럼 뒤쪽 인자는 넘어갑니다.
     */
    'no-unused-vars': [
      'error',
      { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
    // console 은 이 서버의 유일한 로그 수단입니다.
    'no-console': 'off',
  },
  overrides: [
    {
      // 테스트는 node:test 의 전역을 씁니다.
      files: ['**/*.test.js'],
      env: { node: true },
    },
  ],
  ignorePatterns: ['node_modules/', 'public/'],
};
