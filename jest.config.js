/**
 * First Jest config file in the repo. Previously there was no
 * `jest.config.js` and no `"jest"` key in package.json — the tokenizer
 * suite (src/features/reader/webview/__tests__/tokenizer.test.js) still
 * passed because it's a plain CommonJS file with a relative `require()`
 * only, so default Jest + the existing babel.config.js (babel-preset-expo)
 * was enough. TypeScript test files that import via the `@/*` path alias
 * (see tsconfig.json) fail to resolve without this config — confirmed by
 * reproducing the failure before adding this file.
 */
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
