import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/**/utils/__tests__/**/*.test.ts",
      "apps/**/utils/__tests__/**/*.test.ts",
    ],
  },
});
