module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: [ '<rootDir>/tests/setup.js' ],
    // so Jest can run the ESM-only nanoid via dynamic import
    testEnvironmentOptions: { experimentalVmModules: true },
};
