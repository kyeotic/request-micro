// ts-jest is slow and these fixes don't work: https://github.com/kulshekhar/ts-jest/issues/259

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // setupFilesAfterEnv: ['./test/setup.ts'],
  testMatch: ['**/__tests__/*.js?(x)'],
  testTimeout: 1000,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true,
      diagnostics: false,
    },
  },
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
}
