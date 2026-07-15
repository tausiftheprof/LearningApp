/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
};
