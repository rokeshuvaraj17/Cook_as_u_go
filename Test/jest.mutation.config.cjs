module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test-cases'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)', '**/?(*.)+(spec|test).cjs'],
  collectCoverage: false,
};
