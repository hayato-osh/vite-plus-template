# vite-plus-template

Vite+ 上の React 19 + TypeScript アプリ。後半の「Vite+ の使い方」は `vp` が生成した英語版を訳したもの。`vp` の自動更新(`vp config`)で英語に戻らないよう、生成マーカーは外してある。Vite+ を更新したら `node_modules/vite-plus/AGENTS.md` と見比べて手で反映する。

## 完了の定義

変更は、次のすべてが通って初めて完了とする。

```sh
vp check        # フォーマット + lint + 型チェック(型情報を使う oxlint)
vp test         # Vitest。テストファイルが 0 件でも成功する(passWithNoTests)
vp run build    # tsc -b && vp build
```

どれかが失敗したら、実際の出力をそのまま報告する。実行せずに成功したと言わない。

## ルール

- 操作はすべて `vp` 経由で行う(`vp install`、`vp add`、`vp run <script>`)。`pnpm` / `npm` / `npx` を直接呼ばない。固定したパッケージマネージャは `vp` が解決する。
- import は `vite` ではなく `vite-plus` から行う(lint ルール `vite-plus/prefer-vite-plus-imports` で強制)。
- `src/` 内の import は、同じディレクトリなら `./`、それ以外は `@/`(`src/` を指す)で書く。`../` は使わない(lint ルール `no-restricted-imports` で強制)。
- pre-commit フックは `vp staged` を実行し、ステージしたファイルに `vp check --fix` をかける。`--no-verify` で回避しない。

## スタイル

<!-- if css=modules -->

スタイルは CSS Modules で書く。コンポーネントと同じ場所に `<Component>.module.css` を置き、`import styles from "./<Component>.module.css"` で読み込む。グローバルな CSS は増やさない。
<!-- endif -->
<!-- if css=tailwind -->

スタイルは Tailwind CSS(v4)のユーティリティクラスで書く。CSS ファイルは `src/index.css` の `@import "tailwindcss";` だけにし、コンポーネントごとの CSS ファイルは作らない。設定は `tailwind.config.js` ではなく CSS の `@theme` に書く。
<!-- endif -->

<!-- if pwa=pwa -->

## PWA

manifest と Service Worker は `vite-plugin-pwa` が生成する。`public/` に `manifest.webmanifest` や `sw.js` を手で置かず、`vite.config.ts` の `VitePWA()` の設定を変える。Service Worker の動作は `vp dev` では確かめられないので、`vp run build && vp preview` で確かめる。
<!-- endif -->

<!-- if worker=worker -->

## デプロイ

`vp run deploy` は本番に公開するので、ユーザーに頼まれたときだけ実行する。配信の設定は `wrangler.jsonc` に書く。Worker のスクリプト(`main`)は置いていない。API などが要るときは、`@cloudflare/vite-plugin` を入れてから足す。
<!-- endif -->

<!-- if template -->

## テンプレートの開発

このリポジトリはテンプレート本体。`features/<名前>/` が `vp run setup` の選択肢になる。

- テンプレート本体で `vp run setup` を実行しない。`features/` と `scripts/` が消える。
- `features/`、`scripts/setup.ts`、README.md / AGENTS.md の `<!-- if ... -->` ブロックを変えるときは、先に `adding-features` スキルを読む。
- ルートのファイルを変えたら、`features/*/feature.json` の `edit` がそのファイルを指していないか確認する。指していれば、置換前の文字列がまだ残っているかを確かめる(消えると setup がエラーで止まる)。

<!-- endif -->

## スキル

`.agents/skills/` に置く(`.claude/skills` はそこへのシンボリックリンク)。該当する作業の前に読む。

- `pr` — PR の作り方(テンプレートの埋め方、before/after スクショ)
- `testing` — テストの書き方(ラベル、`test.each`、期待値の作り方)
- `writing-skills` — スキル(SKILL.md)の書き方(description、段階的開示、評価の回し方)
- `design` — ロゴ、CI、アイコン、SNS 画像などのデザイン(外部スキル)
- `brand` — ブランドのトーン、ビジュアルアイデンティティ(外部スキル)
- `slides` — HTML のプレゼンテーション(外部スキル)
- `banner-design` — SNS、広告、ヒーロー画像のバナー(外部スキル)

外部スキルは `uipro init --ai universal` で入れたもの。手で直さず、更新するときは入れ直す。

<!-- if css=tailwind -->

UI のデザインや実装の前に `ui-ux-pro-max` を読む。`ui-styling`(Tailwind と shadcn/ui)と `design-system`(デザイントークン)も外部スキル。スキルの内容がこのファイルの「スタイル」とぶつかるときは、このファイルに従う。
<!-- endif -->

# Vite+(Web 向け統合ツールチェーン)の使い方

このプロジェクトは Vite+ を使う。Vite+ は Vite、Rolldown、Vitest、tsdown、Oxlint、Oxfmt、Vite Task の上に作られた統合ツールチェーンで、ランタイム管理、パッケージ管理、フロントエンドのツール群を `vp` という 1 つのグローバル CLI にまとめている。Vite+ は Vite とは別物で、Vite は `vp dev` と `vp build` から呼び出される。コマンド一覧は `vp help`、個々のコマンドの説明は `vp <command> --help` で表示する。

ドキュメントはローカルの `node_modules/vite-plus/docs` か、オンラインの https://viteplus.dev/guide/ にある。

## 組み込みコマンドとスクリプト

`vp <name>` は組み込みコマンドを実行する。`vp run <name>` は `package.json` のスクリプトか `vite.config.ts` のタスクを実行する。スクリプトで組み込みコマンドは上書きできないので、`vp dev` と `vp run dev` は別の動作をすることがある。まず `package.json` と `vite.config.ts` を確認し、その名前のスクリプトかタスクが定義されていれば `vp run <name>` を使う。

## ツールのバージョン

`vp toolchain` で、使用中の Vite+ リリースに含まれる各ツールのバージョンと依存関係を表示する。ツール名を付けるとその部分だけを表示する(例: `vp toolchain vite`)。`--global` を付けるとローカルの `vite-plus` パッケージを無視する。パッケージマネージャ上の依存グラフは `vp why <package>` で表示する。

## レビューチェックリスト

- [ ] リモートの変更を pull したあと、作業を始める前に `vp install` を実行する。
- [ ] `vp check` と `vp test` を実行し、変更のフォーマット、lint、型チェック、テストを行う。
- [ ] 検証に必要な `vite.config.ts` のタスクや `package.json` のスクリプトがないか確認し、あれば `vp run <script>` で実行する。
- [ ] セットアップ、ランタイム、パッケージマネージャの動作がおかしいときは `vp env doctor` を実行し、助けを求めるときはその出力を添える。
