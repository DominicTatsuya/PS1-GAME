import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// ESLint 9 flat config 形式。extends は使えないので、configs を配列に展開する。
export default [
  // 学習用試作ファイルは Lint 対象外（本体から未参照）
  { ignores: ["dist", "lambda/dist", "lambda/node_modules", "src/practice.jsx"] },
  js.configs.recommended,
  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.vite,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
];
