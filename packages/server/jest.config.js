const isCI = process.env.TEST === 'CI'

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  // globals: {
  //   'ts-jest': {
  //     useESM: true,
  //   }
  // },
  // extensionsToTreatAsEsm: ['.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: isCI,
  collectCoverageFrom: ['./src/**/*.ts'],
  modulePathIgnorePatterns: ['/node_modules/', '/dist/', '/mocks/'],
};
