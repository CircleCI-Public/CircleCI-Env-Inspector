module.exports = {
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: "tsconfig.json",
  },
  plugins: [
    "@typescript-eslint",
    "eslint-plugin-tsdoc",
    "prettier",
    "security",
    "simple-import-sort",
  ],
  rules: {
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "tsdoc/syntax": "warn",
    "@typescript-eslint/indent": "off",
    "linebreak-style": ["error", "unix"],
    "prettier/prettier": "error",
    "security/detect-object-injection": "off",
  },
};
