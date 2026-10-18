import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "/";
  }

  return `/${value.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig({
  base: normalizeBasePath(process.env.ORBIT_ATLAS_BASE_PATH),
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    restoreMocks: true,
    exclude: [...configDefaults.exclude, "tests/**"],
  },
});
