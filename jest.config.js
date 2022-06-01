// ts-jest is slow and these fixes don't work: https://github.com/kulshekhar/ts-jest/issues/259

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // setupFiles: ['./test/setup.ts'],
  testMatch: ["**/__tests__/*.ts?(x)"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
      isolatedModules: true,
      diagnostics: false,
    },
  },
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],
};
