module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
      'neo4j-driver': '<rootDir>/node_modules/neo4j-driver',
    },
  };