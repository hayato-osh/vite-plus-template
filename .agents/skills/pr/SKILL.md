---
name: pr
description: このリポジトリの PR を gh で作る手順。「PR を作って」「プルリクを出して」と言われたとき、または作業をブランチにまとめて main に出すときに読む。テンプレート (.github/pull_request_template.md) の埋め方と、before/after スクショの添付方法を含む。
---

# PR 作成手順

## 手順

1. `git status` / `git log main..HEAD` で入る差分を確認。main 上ならブランチを切る。
2. AGENTS.md の「完了の定義」(`vp check` / `vp test` / `vp run build`)をすべて通す。
3. コミット。メッセージは日本語 (prefix は英語。`feat:` `fix:` `chore:` など)。粒度は下記「コミット粒度」に従う。
4. `git push -u origin HEAD`
5. UI 変更があれば before/after スクショを撮る (下記)。
6. 本文を書いて `gh pr create`。

## コミット粒度

1 コミット = 1 つの論理的な変更。メッセージを 1 行で書けない (「〜と〜」になる) なら分ける。

- 各コミットで `vp check` / `vp test` が通る状態にする。途中で壊れたコミットを作らない。
- リファクタ・リネーム・依存更新は、挙動を変えるコミットと分ける。レビューで「挙動は変わらない」差分を読み飛ばせるようにするため。
- 機能とそのテストは同じコミットに入れる。
- 「レビュー指摘対応」「typo 修正」のような後追いの修正は、push 前なら `git commit --fixup` + `git rebase --autosquash main` で元のコミットに畳む。
- 小さな変更を無理に分けない。数行の修正なら 1 コミットで足りる。

## 本文

`.github/pull_request_template.md` をそのまま雛形に使う。日本語で、できるだけ簡潔に。

**issue に書いてあることを PR で繰り返さない。** 背景・目的・受け入れ条件が issue にあるなら
`Closes #123` だけで足りる。PR 本文に書くのは、issue に書かれていないことだけでよい。

- 実装が issue の想定と違う → その理由と実際にやったことを詳しく書く。
- 対象範囲を削った / 広げた → 何を外したか、なぜかを書く。
- issue にない判断をした (命名、データ構造、後方互換の扱いなど) → 書く。
- issue どおりに素直に実装しただけ → What / Why は 1 行ずつで終わらせる。

テンプレートの各節は次のように埋める。

| 節    | 書くこと                                                                   |
| ----- | -------------------------------------------------------------------------- |
| Issue | 対応する issue があれば `Closes #123`。なければ節ごと消す                  |
| What  | 何をしたか。ファイル名の羅列ではなく、挙動の変化で書く                     |
| Why   | なぜ必要か。issue にあるなら 1 行で足りる                                  |
| Diff  | UI 変更の before/after。UI 変更がなければ「UI 変更なし」と書いて表ごと消す |

本文はヒアドキュメントで一時ファイルに書いて `--body-file` で渡す (`-b` に長文を埋めない)。

```sh
cat > /tmp/pr.md <<'BODY'
## Issue
...
BODY
gh pr create --base main --title "feat: ..." --body-file /tmp/pr.md
```

## スクショ

`gh` が画像をアップロードする。外部ホスティングも base64 も不要。

本文中の `![before](./before.png)` のような相対パス参照は、同じファイルを `--attach` すると
アップロード後の URL に書き換えられる。テンプレートの Diff 表はそれ前提の書き方になっている。

```sh
gh pr create --base main --title "..." --body-file /tmp/pr.md \
  --attach ./before.png --attach ./after.png
```

作成済みの PR に後から足すなら `gh pr edit <番号> --attach ./after.png` (既存の本文は変わらず、画像が末尾に追記される)。

撮り方: `vp dev` を立てて、390px 幅 (モバイル縦) を撮る。Playwright は依存に無いので `vp dlx` で実行する。

```sh
vp dlx -- playwright install chromium   # 初回のみ
vp dlx -- playwright screenshot --viewport-size=390,844 http://localhost:5173/ after.png
```

- ライト / ダークで見え方が変わる変更なら `--color-scheme=dark` も撮る。
- before は変更前のコミットを checkout して同じ URL を撮る。
- スクショはコミットしない。
