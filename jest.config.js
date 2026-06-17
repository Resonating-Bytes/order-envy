module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/api/**/*.test.js',
        '**/tests/unit/**/*.test.js',
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000,
    maxWorkers: 1,
};
