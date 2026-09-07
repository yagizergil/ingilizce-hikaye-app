// Design-token enforcement: components must always go through
// src/theme (colors, spacing, radius, type) instead of hardcoding raw
// hex colors or raw numeric fontSize/padding/margin/gap values. See
// docs/DESIGN.md "Usage rules". src/theme/** itself is where these
// literals legitimately live, so it's excluded below.
const noRawHexColor = {
  selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
  message: "Do not hardcode hex colors — use theme.* (useTheme()) tokens from src/theme instead.",
};

const noRawStyleSheetNumbers = {
  selector:
    "CallExpression[callee.object.name='StyleSheet'][callee.property.name='create'] Property[key.name=/^(fontSize|lineHeight|letterSpacing|padding\\w*|margin\\w*|gap)$/] > Literal",
  message:
    "Do not hardcode fontSize/lineHeight/letterSpacing/padding/margin/gap literals in StyleSheet.create — use spacing.*/type.*/monoType.*/readingType.* tokens from src/theme/tokens instead.",
};

module.exports = {
  root: true,
  extends: ["expo", "prettier"],
  ignorePatterns: [
    "/dist/*",
    "/.expo/*",
    "pipeline/**",
    "supabase/functions/**",
    // Plain CommonJS ES5/ES2017 JS, string-inlined verbatim into a WebView
    // <script> tag at runtime (ADR-007/ADR-008) — not RN/TS component code,
    // so the app's TS/no-`any`/ESM-only conventions don't apply here. The
    // `npm run lint` script already only targets --ext .ts,.tsx and never
    // touches this directory; this entry additionally protects a raw/global
    // `eslint .` invocation from erroring on intentional `var`/CommonJS use.
    "src/features/reader/webview/**",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  overrides: [
    {
      // Token enforcement only applies to app screens and src components —
      // not root-level config files (app.config.ts, metro.config.js, ...)
      // which legitimately hold raw values (e.g. splash screen color).
      files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
      excludedFiles: ["src/theme/**"],
      rules: {
        "no-restricted-syntax": ["error", noRawHexColor, noRawStyleSheetNumbers],
      },
    },
  ],
};
