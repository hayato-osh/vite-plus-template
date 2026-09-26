import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  test: {
    passWithNoTests: true,
  },
  fmt: {
    // 外部のスキル(uipro init --ai universal で入れたもの)。更新時に差分が出ないよう整形しない。
    // Tailwind 用の 3 つはテンプレート本体では features/tailwind/ に、setup 後は .agents/skills/ にある
    ignorePatterns: [
      "**/.agents/skills/banner-design/**",
      "**/.agents/skills/brand/**",
      "**/.agents/skills/design/**",
      "**/.agents/skills/slides/**",
      "**/.agents/skills/design-system/**",
      "**/.agents/skills/ui-styling/**",
      "**/.agents/skills/ui-ux-pro-max/**",
    ],
  },
  lint: {
    // features/ は setup 後に Template ワークフローで検査する。setup がこの行を消す
    ignorePatterns: ["features/**"],
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
      // 同じディレクトリは "./"、それ以外は "@/" で import する
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["../*"], message: '親ディレクトリは "@/" で import する' }],
        },
      ],
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  plugins: lazyPlugins(() => [react()]),
});
