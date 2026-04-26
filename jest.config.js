// jest.config.cjs
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    moduleNameMapper: {
        '^obsidian$': '<rootDir>/src/__mocks__/obsidian.js',
    },
    testMatch: [
        '**/__tests__/**/*.test.js',
    ],
    setupFiles: ['./jest.setup.js'],
};