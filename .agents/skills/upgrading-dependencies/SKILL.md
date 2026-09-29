---
name: upgrading-dependencies
description: ライブラリの新しい版で推奨される書き方・非推奨になった書き方を調べ、テンプレート(ルートと features/)のコードと AGENTS.md のルールを追従させる手順。ルートの依存や pnpm-workspace.yaml の catalogs を上げるとき、Renovate の PR をマージする前、「バージョンを上げて」「新しい書き方に追従して」「最新の推奨に合わせて」と言われたとき、Template ワークフローが依存の更新で落ちたときに読む。
---

# 依存の更新と書き方の追従

テンプレート本体でだけ使う。setup がこのスキルごと消す。

版を上げるだけで終わらせない。新しい版では、以前は回避策が必要だったことが素直に書けるようになったり、推奨の書き方が変わったりする。テンプレートは派生プロジェクトの手本なので、その版の推奨に合わせる。

## 手順

```
- [ ] 1. 上げた依存と、前後の版を洗い出す
- [ ] 2. 前後の版の間のリリースノートと移行ガイドを読み、変更点を書き出す
- [ ] 3. 変更点ごとに、テンプレートのどこが該当するかを探す
- [ ] 4. 書き換える
- [ ] 5. 検証する(失敗したら直して 5 をやり直す)
- [ ] 6. 採用した変更と見送った変更をユーザーに報告する
```

### 1. 洗い出し

`git diff main -- package.json pnpm-workspace.yaml` で、前後の版を並べる。Renovate の PR なら、PR 本文にも前後の版が載っている。patch だけの更新なら、2 と 3 は飛ばして 5 の検証だけでよい。

### 2. 変更点を読む

前の版から新しい版までのすべての版を読む(最新の版だけ読まない)。情報源は次の順に探す。

1. 移行ガイド(メジャー更新のとき)。公式ドキュメントの "Migrating to vX" や "Upgrade guide"。
2. GitHub のリリース: `gh release list -R <owner>/<repo>` で一覧、`gh release view <tag> -R <owner>/<repo>` で本文を読む。リポジトリは `vp pm view <パッケージ> repository.url` で調べる。モノレポ(TanStack/router など)はタグがパッケージごと(`@tanstack/router-plugin@1.170.0`)なので、`gh release list -R <owner>/<repo> -L 200 | grep <パッケージ>` で絞る。
3. リポジトリの `CHANGELOG.md`(`gh api repos/<owner>/<repo>/contents/<パス>` で読む。モノレポはパッケージのディレクトリ内にある)。
4. vite-plus は `node_modules/vite-plus/docs` と `node_modules/vite-plus/AGENTS.md`。

catalogs の依存(features/ のもの)はテンプレートの `node_modules` に入っていないので、ローカルの型定義は読めない。必要なら 5 の setup したコピーで読む。

読みながら、テンプレートに関係しうるものだけ書き出す。

- 非推奨になった API・オプション・import パス(と、その代わり)
- 新しく推奨された書き方(ドキュメントの例やテンプレート、`create-*` の生成物が変わったもの)
- デフォルト値の変更(明示していた設定が不要になる、または明示が必要になる)
- 以前は回避策が要った問題の修正

推測で「こちらの方が良さそう」と判断しない。公式のドキュメント・リリースノートに根拠があるものだけを採る。

### 3. 該当箇所を探す

書き出した API 名やオプション名で、次の場所を grep する。

- `src/`、`vite.config.ts`、`tsconfig.*.json` などルートのファイル
- `features/*/` のファイル(`src/App.tsx`、`src/routes/*.tsx`、`src/index.css`、`cloudflare.config.ts` など)
- `features/*/feature.json` の `edit` の置換後の文字列(`VitePWA({...})` や `tanstackRouter({...})` のように、コードがここに埋まっている)
- `AGENTS.md` と `README.md` の条件ブロックに書いたルール(ライブラリの書き方を指示しているもの)
- `pnpm-workspace.yaml` と `vite.config.ts` のコメント付きの回避策(`trustPolicyExclude`、`ignorePatterns` など)。理由が解消していれば消す

### 4. 書き換える

- 1 つの変更点に対し、該当するすべての場所を同じ書き方に揃える。ルートと features/ の両方にある書き方は、片方だけ直さない。
- `feature.json` の `edit` の置換前の文字列はルートのファイルに依存する。ルートを書き換えたら、置換前の文字列がまだ残っているかを 5 のチェックで確かめる。
- `features/tanstack-router/src/routeTree.gen.ts` は生成物なので手で直さない。`@tanstack/router-plugin` を上げたら、5 のコピーで作り直して持ち帰る(下記)。
- AGENTS.md のルールを書き換えるときは、`adding-features` スキルの条件ブロックの書き方に従う。
- 版に固有の事情(`trustPolicyExclude` の版、`cloudflare.config.ts` の `compatibilityDate`、`allowBuilds`)も新しい版に合わせる。

### 5. 検証

置換前の文字列が残っているかを確かめる。次をそのまま実行する。

```sh
node -e 'const fs=require("fs");let ng=0;for(const f of fs.readdirSync("features")){const j=JSON.parse(fs.readFileSync(`features/${f}/feature.json`));for(const[p,rs]of Object.entries(j.edit??{}))for(const[b]of rs)if(!fs.readFileSync(p,"utf8").includes(b)){ng=1;console.log(`${f}: ${p} に無い: ${JSON.stringify(b)}`)}}process.exit(ng)'
```

テンプレート本体で完了の定義を通す。

```sh
vp install && vp check && vp test && vp run build
```

`.github/workflows/template.yml` の matrix と同じ全組み合わせを setup して通す。オプションを足したら、ここのループも足す。

```sh
for css in modules tailwind; do for pwa in none pwa; do for worker in none worker; do for router in tanstack none; do
  d=$(mktemp -d)
  rsync -a --exclude node_modules --exclude /dist --exclude .git ./ "$d/"
  (cd "$d" && vp run setup --css $css --pwa $pwa --worker $worker --router $router \
    && vp install --no-frozen-lockfile && vp check && vp test && vp run build) >"$d.log" 2>&1 \
    && echo "OK $css $pwa $worker $router" || echo "NG $css $pwa $worker $router: $d.log"
done; done; done; done
```

`routeTree.gen.ts` の作り直しは次のとおり。

```sh
d=$(mktemp -d)
rsync -a --exclude node_modules --exclude /dist --exclude .git ./ "$d/"
(cd "$d" && vp run setup --router tanstack && vp install --no-frozen-lockfile && vp run build) \
  && cp "$d/src/routeTree.gen.ts" features/tanstack-router/src/routeTree.gen.ts
```

### 6. 報告

変更点ごとに、採用したか見送ったかを根拠のリンク付きで報告する。

```md
- @tanstack/router-plugin 1.168 → 1.170
  - 採用: <変更点>。<直したファイル>。根拠: <リリースノートの URL>
  - 見送り: <変更点>。理由: <テンプレートで使っていない機能 など>
```
