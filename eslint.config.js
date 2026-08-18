import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Analytics vendor seam: all third-party analytics/marketing dispatch must live
  // inside src/lib/analytics.ts, below its consent check.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/analytics.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...["gtag", "fbq", "amplitude", "clarity", "dataLayer", "_paq", "posthog"].map((name) => ({
          name,
          message:
            "Analytics/marketing vendor calls belong inside dispatchToAnalyticsVendors or dispatchToMarketingVendors in src/lib/analytics.ts, below the consent check. Call track() or trackMarketing() from here instead — firing events for users who declined consent is a compliance problem, not a style preference.",
        })),
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='window'][computed=false][property.name=/^(gtag|fbq|amplitude|clarity|dataLayer|_paq|posthog)$/]",
          message:
            "Analytics/marketing vendor calls belong inside dispatchToAnalyticsVendors or dispatchToMarketingVendors in src/lib/analytics.ts, below the consent check. Call track() or trackMarketing() from here instead — firing events for users who declined consent is a compliance problem, not a style preference.",
        },
        {
          selector:
            "MemberExpression[object.name='window'][computed=true][property.value=/^(gtag|fbq|amplitude|clarity|dataLayer|_paq|posthog)$/]",
          message:
            "Analytics/marketing vendor calls belong inside dispatchToAnalyticsVendors or dispatchToMarketingVendors in src/lib/analytics.ts, below the consent check. Call track() or trackMarketing() from here instead — firing events for users who declined consent is a compliance problem, not a style preference.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
          patterns: [
            {
              group: [
                "react-ga4",
                "posthog-js",
                "posthog-js/*",
                "@amplitude/*",
                "mixpanel-browser",
                "@segment/*",
                "analytics",
                "@analytics/*",
                "react-gtm-module",
                "@vercel/analytics",
                "@vercel/analytics/*",
                "@sentry/browser",
                "logrocket",
                "@hotjar/browser",
                "react-facebook-pixel",
                "react-pixel",
              ],
              message:
                "Import analytics/marketing SDKs only in src/lib/analytics.ts, inside dispatchToAnalyticsVendors or dispatchToMarketingVendors below the consent check. Elsewhere, call track() or trackMarketing() — firing events for users who declined consent is a compliance problem, not a style preference.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);

