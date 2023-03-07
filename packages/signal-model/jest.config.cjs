
const isCI = process.env.TEST === 'CI'

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: isCI,
  collectCoverageFrom: ['./src/**/*.ts'],
  testSequencer: './jest-custom-sequencer.cjs'
};