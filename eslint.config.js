import js from "@eslint/js";

const gjsGlobals = {
    console: "readonly",
    globalThis: "readonly",
    logError: "readonly",
    TextDecoder: "readonly",
};

export default [
    {
        ignores: ["builddir/**", "dist/**", "node_modules/**"],
    },
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: gjsGlobals,
        },
        rules: {
            "class-methods-use-this": "off",
            "no-console": "off",
        },
    },
];
