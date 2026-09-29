import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "vite-plus-template",
    compatibilityDate: "2026-09-01",
    assets: {
      notFoundHandling: "single-page-application",
    },
  },
});
