/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./eslint-base.js'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
