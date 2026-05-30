import { FlatCompat } from "@eslint/eslintrc";
import nextVitals from "eslint-config-next/core-web-vitals";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  { ignores: ["public/mediapipe/**"] },
  ...(Array.isArray(nextVitals) ? nextVitals : compat.config(nextVitals)),
];

export default config;
