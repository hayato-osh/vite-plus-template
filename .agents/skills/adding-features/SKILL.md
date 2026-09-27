---
name: adding-features
description: テンプレートの setup(`vp run setup`)で選べる構成(feature)を追加・修正する手順。features/ の作り方、feature.json、catalogs、scripts/setup.ts の choices、Template ワークフローの matrix、README/AGENTS.md の条件ブロック、検証方法を含む。「feature を追加して」「setup で ○○ を選べるようにして」「D1 / shadcn / ○○ をオプションにして」と言われたとき、features/ や scripts/setup.ts を変更するとき、feature.json の edit が指すルートのファイル(vite.config.ts、src/main.tsx など)を変更するときに読む。
---

# feature の追加

テンプレート本体でだけ使う。setup がこのスキルごと消すので、派生プロジェクトには残らない。

## 仕組み

`vp run setup --<オプション> <値>` は、`scripts/setup.ts` の `choices` で値に対応する `features/<名前>/` を選び、次を行う。

- `feature.json` の依存と scripts をルートの `package.json` にマージする
- `feature.json` 以外のファイルを、ルートの同じパスにコピーする。ルートに既にあるファイルは `overwrite` に書いたものしか上書きできない(書いていなければエラーで止まる)
- `feature.json` の `edit` で、ルートのファイルを部分編集する(置換前の文字列が見つからなければエラーで止まる)
- `feature.json` の `remove` に書いたファイルを消す
- `pnpm-workspace.yaml` の `catalogs` から、選ばれなかった feature のブロックを消す
- README.md と AGENTS.md の条件ブロックを選択に合わせて残す/消す
- `features/`、`scripts/`、`.github/workflows/template.yml`、このスキルを消す

テンプレート本体で `vp run setup` を実行しない。`features/` と `scripts/` が消える。

## 手順

```
- [ ] 1. features/<名前>/ に新しいファイルを置く
- [ ] 2. features/<名前>/feature.json を書く
- [ ] 3. pnpm-workspace.yaml の catalogs.<名前> にバージョンを書く
- [ ] 4. scripts/setup.ts の choices に値を足す
- [ ] 5. .github/workflows/template.yml の matrix に値を足す
- [ ] 6. README.md と AGENTS.md に条件ブロックを書く
- [ ] 7. すべての組み合わせで検証する(失敗したら直して 7 をやり直す)
```

### 1. 新しいファイル

ルートと同じパスに置く。`features/tailwind/src/index.css` は setup 後に `src/index.css` になる。スキルは `features/<名前>/.agents/skills/<スキル名>/SKILL.md` に置けば、その feature を選んだときだけ入る。

ルートにもあるファイル(`vite.config.ts`、`src/main.tsx`、`tsconfig.*.json`、`.gitignore` など)は置かず、2 の `edit` で部分編集する。丸ごとコピーすると、あとでルートを変えたときに feature 側が古いまま残り、変更が消える。例外は中身ごと差し替えるデモ用のファイル(`src/App.tsx` など)で、`overwrite` に書く。同じファイルを `overwrite` する feature が同時に選ばれると setup はエラーで止まるので、別オプションの feature がすでに `overwrite` しているファイルには使わない(デモは新しいファイルに置く)。

新しいディレクトリ(`worker/` など)や設定ファイル(`drizzle.config.ts` など)を型チェックの対象にするには、`edit` で tsconfig に足す(`tsconfig.node.json` の include、または専用の `tsconfig.*.json` を置いて `tsconfig.json` の references)。

ツールが生成するファイル(drizzle の `migrations/meta/*.json` など)が `vp check` のフォーマット検査で落ちるときは、`.prettierignore` に書く(Oxfmt が読む)。

### 2. feature.json

```json
{
  "dependencies": { "drizzle-orm": "catalog:d1" },
  "devDependencies": { "drizzle-kit": "catalog:d1", "wrangler": "catalog:d1" },
  "scripts": { "db:generate": "drizzle-kit generate" },
  "edit": {
    "vite.config.ts": [["react()", "react(), cloudflare()"]],
    ".gitignore": [["node_modules\n", "node_modules\n.wrangler\n"]]
  },
  "overwrite": ["src/App.tsx"],
  "requires": ["tailwind"],
  "remove": ["src/App.module.css"]
}
```

- バージョンは直接書かず、必ず `catalog:<名前>` にする(Renovate は catalogs を更新する)。
- `scripts` はルートの `package.json` の scripts にマージされる。
- `edit` はファイルごとに `[置換前, 置換後]` を並べ、上から順に最初の一致を 1 回だけ置換する。置換前には、ルートで変わりにくく、そのファイルに 1 回だけ出てくる短い文字列を選ぶ。行ごと差し替えず、`"react()"` → `"react(), cloudflare()"` のように既存部分を残して足す。こうすると別の feature が同じ箇所を編集しても両方残る。
- `requires` は、この feature と一緒に選ばれている必要がある feature(例: shadcn には tailwind)。足りなければ setup がエラーで止まる。
- features は `choices` の順に処理される。依存先を先に処理させたいときは、依存先のオプションを `choices` の前に置く。
- 不要なフィールドは省く。

### 3. catalogs

```yaml
catalogs:
  tailwind:
    "@tailwindcss/vite": 4.3.3
    tailwindcss: 4.3.3
  d1:
    drizzle-orm: 0.45.0
```

範囲指定(`^`)は付けず、正確なバージョンにする。最新版は `vp pm view <パッケージ> version` で調べる。`pnpm-workspace.yaml` の `minimumReleaseAge`(7 日)より新しい版は `vp install` が拒否するので、そのときは 1 つ前の版にする。

ビルドスクリプトを持つ依存(esbuild、workerd など)を足すと、`strictDepBuilds: true` のため `vp install` が `ERR_PNPM_IGNORED_BUILDS` で止まる。`pnpm-workspace.yaml` のルートにある `allowBuilds` に `<パッケージ>: true` を足す。feature 単位では入れられないので、その feature を選ばなかったときも残る(実害はない)。

### 4. choices

```ts
const choices: Record<string, Record<string, string | null>> = {
  css: { modules: null, tailwind: "tailwind" },
  db: { none: null, d1: "d1" },
};
```

先頭の値がデフォルト。`null` は何も重ねない(ルートのまま)。オプションを増やすと `--db` のようなフラグが自動で増える。

### 5. template.yml

```yaml
matrix:
  css: [modules, tailwind]
  db: [none, d1]
```

オプションを足したら、setup の行にも `--db ${{ matrix.db }}` を足す。`upgrading-dependencies` スキルの全組み合わせのループにも足す。matrix は全組み合わせを回す。`requires` で成り立たない組み合わせは `exclude` で外す。

```yaml
matrix:
  css: [modules, tailwind]
  ui: [none, shadcn]
  exclude:
    - { css: modules, ui: shadcn }
```

### 6. 条件ブロック

```md
<!-- if db=d1 -->

DB は Cloudflare D1 + drizzle。スキーマは `src/db/schema.ts`。
<!-- endif -->
```

- マーカーは単独の行に書く。`<!-- if テンプレート専用の説明 -->` の代わりに `<!-- if template -->` を使うと、setup 後は常に消える。
- 箇条書きの途中に置かない。フォーマッタがマーカーの前後に空行を入れ、リストが崩れる。節か段落の単位で分ける。
- AGENTS.md には、その feature を選んだときにエージェントが守るルールを書く(ライブラリの一般的な説明は書かない)。

### 7. 検証

`features/` はテンプレートの `vp check` の対象外なので、setup したコピーで検証する。オプションの組み合わせごとに、次をそのまま実行する。

```sh
d=$(mktemp -d)
rsync -a --exclude node_modules --exclude /dist --exclude .git ./ "$d/"
cd "$d" && vp run setup --css tailwind --db d1 \
  && vp install --no-frozen-lockfile \
  && vp check && vp test && vp run build && vp run lint:text \
  && ! grep -q "<!--" README.md AGENTS.md
```

最後の `grep` はマーカーの消し残しを検出する。テンプレート本体でも完了の定義(`vp check`、`vp test`、`vp run build`)を通す。

## テンプレート専用のファイルを増やすとき

setup 後に要らないファイルは、`scripts/setup.ts` 末尾の削除リストに足す。説明文は `<!-- if template -->` の中に書く。
