module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test-cases'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)', '**/?(*.)+(spec|test).cjs'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/mutation-targets/scanUpstream.js'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      lines: 100,
      statements: 100,
      branches: 100,
      functions: 100,
    },
  },
};
