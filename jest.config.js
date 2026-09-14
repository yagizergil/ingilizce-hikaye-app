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
  // @formatjs/intl-pluralrules (ve onun transitive'leri intl-localematcher,
  // fast-memoize, bigdecimal) saf ESM paketler — jest-expo'nun varsayılan
  // transformIgnorePatterns'ı bunları node_modules'ta olduğu için atlıyor
  // ve `import`/`export` sentaksında patlıyordu. src/i18n/index.ts bu
  // polyfill'i gerçekten import ettiği için (i18n.ts'yi gerçek t() ile test
  // etmek istiyorsak) bu paketlerin de transform edilmesi gerekiyor.
  // Gerekçe jest.setup.js içinde.
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@formatjs))",
    "/node_modules/react-native-reanimated/plugin/",
  ],
};
