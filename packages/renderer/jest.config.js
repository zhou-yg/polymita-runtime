/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  // globals: {
  //   'ts-jest': {
  //     useESM: true,
  //   }
  // },
  // extensionsToTreatAsEsm: ['.ts'],
  // watch: !!process.env.WATCH,
  // collectCoverage: !!process.env.C,
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['./src/*.ts', './src/lib/propTypes.ts'],
  testMatch: ['**/__test__/*/*.test.ts'],
  modulePathIgnorePatterns: ['/node_modules/', '/dist/', '/mocks/'],
};
