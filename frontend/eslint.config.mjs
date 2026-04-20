import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ resolvePluginsRelativeTo: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "plugin:jsx-a11y/recommended"),
  {
    rules: {
      "jsx-a11y/anchor-is-valid": "warn",
    },
  },
];
