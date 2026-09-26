# vite-plus-template

[Vite+](https://viteplus.dev/)(`vp`)で作る React 19 + TypeScript アプリ。コーディングエージェントに任せて開発する前提で、エージェント向けの指示を `AGENTS.md` にまとめている。

<!-- if template -->

## 使い方

このリポジトリはテンプレート。`vp create` で作り、`vp run setup` で構成を選ぶ。

```sh
vp create github:hayato-osh/vite-plus-template --no-interactive -- <project>
cd <project>
vp run setup              # 構成を選ぶ(下の表)。何も付けなければデフォルト
vp install
vp dev
```

| オプション | 値                                         |
| ---------- | ------------------------------------------ |
| `--css`    | `modules`(デフォルト)/ `tailwind`          |
| `--pwa`    | `none`(デフォルト)/ `pwa`                  |
| `--name`   | プロジェクト名(デフォルトはディレクトリ名) |

`vp create` の `--directory` は builtin テンプレート専用で、github テンプレートに付けるとエラーになる。ディレクトリ名は `--` の後に渡す。

`vp run setup` は選んだ `features/` をプロジェクトに重ね、`features/` と `scripts/setup.ts` などテンプレート用のファイルを消す。`package.json` の `name`、`index.html` の `<title>`、`README.md` と `AGENTS.md` の見出しをプロジェクト名に置き換え、`.claude/skills` のシンボリックリンクを作り直す。一度だけ実行する。

<!-- endif -->

## コマンド

| コマンド       | 内容                             |
| -------------- | -------------------------------- |
| `vp dev`       | 開発サーバーを起動する           |
| `vp check`     | フォーマット + lint + 型チェック |
| `vp test`      | テスト(Vitest)                   |
| `vp run build` | `tsc -b && vp build`             |
| `vp preview`   | ビルド結果をプレビューする       |

パッケージの追加は `vp add <pkg>`。`pnpm` / `npm` は直接使わない(パッケージマネージャは `vp` が解決する)。

## スタイル

<!-- if css=modules -->

CSS Modules(`*.module.css`)で書く。
<!-- endif -->
<!-- if css=tailwind -->

Tailwind CSS v4 で書く。`src/index.css` で読み込み、`@tailwindcss/vite` プラグインでビルドする。
<!-- endif -->

<!-- if pwa=pwa -->

## PWA

`vite-plugin-pwa` で manifest と Service Worker をビルド時に生成する。設定は `vite.config.ts` の `VitePWA()`。Service Worker は `vp dev` では動かないので、`vp run build && vp preview` で確かめる。
<!-- endif -->

<!-- if router=tanstack -->

## ルーティング

TanStack Router のファイルベースルーティング。ページは `src/routes/` に置く。`src/routeTree.gen.ts` は `vp dev` / `vp build` が生成する。
<!-- endif -->

<!-- if worker=worker -->

## デプロイ

Cloudflare Workers の静的アセットとして配信する。`vp run deploy` でビルドし、`dist/` を `wrangler deploy` で上げる。設定は `wrangler.jsonc`。知らないパスには `index.html` を返す(SPA)。
<!-- endif -->

## 構成

- lint とフォーマットは Oxlint(型情報を使うルールつき)と Oxfmt。設定は `vite.config.ts` の `lint` / `fmt` にまとめてあり、`.oxlintrc.json` は無い。
- Markdown の文章は textlint(`@textlint-ja/preset-ai-writing`)で検査する。`vp run lint:text` で実行する。
- pre-commit フック(`.vite-hooks/pre-commit`)が `vp staged` を実行し、ステージしたファイルに `vp check --fix` をかける。
- エージェント向けの指示は `AGENTS.md` にある(Claude Code、Codex などが読む)。完了の定義とルールを書いている。
- スキルは `.agents/skills/`(`pr`、`testing`、`writing-skills`、デザイン用の `design` など。Tailwind を選ぶと UI 用の `ui-ux-pro-max` なども入る)に置き、`.claude/skills` はそこへのシンボリックリンク。PR テンプレートは `.github/pull_request_template.md`。

## メンテナンス

- `AGENTS.md` の後半は `vp` が生成する英語版を日本語に訳したもの。`vp config` で英語に戻らないよう、生成マーカーは外してある。Vite+ を更新したら `node_modules/vite-plus/AGENTS.md` と見比べて手で反映する。

<!-- if template -->

- 選べる構成は `features/<名前>/` に置く。`feature.json` に追加する依存(バージョンは `pnpm-workspace.yaml` の `catalogs.<名前>` に書き、Renovate がそこを更新する)、ルートのファイルへの部分編集、消すファイルを書く。それ以外のファイルはルートに同じパスでコピーされる。オプションとの対応は `scripts/setup.ts` の `choices`。手順は `adding-features` スキルにある。
- `features/` はテンプレートの `vp check` の対象外。`.github/workflows/template.yml` が組み合わせごとに setup してから完了の定義を通す。
- README.md と AGENTS.md の `<!-- if キー=値 -->` 〜 `<!-- endif -->` は setup が選択に合わせて残す。`<!-- if template -->` は常に消える。

<!-- endif -->

- 派生プロジェクトでエージェントが間違えたら、その対策をテンプレート(hayato-osh/vite-plus-template)の `AGENTS.md` に戻す。
