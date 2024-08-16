module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: [
        "/node_modules/",
        "ERC721_ABI.ts",
        "ERC20_ABI.ts"
      ]
};