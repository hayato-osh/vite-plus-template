// テンプレートから作ったプロジェクトで一度だけ実行する。選んだ features/ を重ね、テンプレート用のファイルを消す。
// 使い方: vp run setup --css tailwind --pwa pwa --router none [--name <プロジェクト名>]
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, relative } from "node:path";
import { parseArgs } from "node:util";

// オプション → 値 → 重ねる features/<名前>(null なら何も重ねない)。先頭の値がデフォルト
const choices: Record<string, Record<string, string | null>> = {
  css: { modules: null, tailwind: "tailwind" },
  pwa: { none: null, pwa: "pwa" },
  worker: { none: null, worker: "worker" },
  router: { tanstack: "tanstack-router", none: null },
};

const options: Record<string, { type: "string"; default: string }> = {
  name: { type: "string", default: basename(process.cwd()) },
};
for (const [option, table] of Object.entries(choices)) {
  options[option] = { type: "string", default: Object.keys(table)[0] };
}
const { values } = parseArgs({ options });
const projectName = String(values.name);

const features: string[] = [];
for (const [option, table] of Object.entries(choices)) {
  const value = String(values[option]);
  if (!(value in table)) {
    throw new Error(`--${option} は ${Object.keys(table).join(" / ")} のどれか: ${value}`);
  }
  const feature = table[value];
  if (feature) features.push(feature);
}

type Feature = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  // ファイル → [置換前, 置換後] の列。ルートのファイルは丸ごと上書きせずこれで部分編集する
  edit?: Record<string, [string, string][]>;
  // ルートにもあるが丸ごと上書きしてよいファイル
  overwrite?: string[];
  // 一緒に選ばれている必要がある feature
  requires?: string[];
  remove?: string[];
};

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path: string, data: unknown) =>
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
const sortKeys = (obj: Record<string, string>) =>
  Object.fromEntries(Object.entries(obj).toSorted(([a], [b]) => a.localeCompare(b)));

const pkg = readJson("package.json");
// overwrite したパス → feature。2 つの feature が同じファイルを丸ごと上書きすると片方が消えるので止める
const overwritten = new Map<string, string>();

for (const name of features) {
  const dir = `features/${name}`;
  const feature: Feature = readJson(`${dir}/feature.json`);
  const missing = feature.requires?.filter((r) => !features.includes(r)) ?? [];
  if (missing.length > 0) throw new Error(`${name} には ${missing.join(", ")} も選ぶ必要がある`);
  for (const field of ["dependencies", "devDependencies"] as const) {
    if (feature[field]) pkg[field] = sortKeys({ ...pkg[field], ...feature[field] });
  }
  pkg.scripts = { ...pkg.scripts, ...feature.scripts };
  cpSync(dir, ".", {
    recursive: true,
    filter: (src) => {
      const path = relative(dir, src);
      if (path === "feature.json") return false;
      if (statSync(src).isFile() && existsSync(path)) {
        if (!feature.overwrite?.includes(path)) {
          throw new Error(`${dir}/${path} はルートにもある。feature.json の edit で部分編集する`);
        }
        const other = overwritten.get(path);
        if (other) throw new Error(`${other} と ${name} が両方 ${path} を overwrite している`);
        overwritten.set(path, name);
      }
      return true;
    },
  });
  for (const [path, pairs] of Object.entries(feature.edit ?? {})) {
    let text = readFileSync(path, "utf8");
    for (const [from, to] of pairs) {
      if (!text.includes(from)) throw new Error(`${dir}: ${path} に置換前の文字列が無い: ${from}`);
      text = text.replace(from, to);
    }
    writeFileSync(path, text);
  }
  for (const path of feature.remove ?? []) rmSync(path, { force: true });
}

pkg.name = projectName;
delete pkg.scripts.setup;
writeJson("package.json", pkg);

// pnpm-workspace.yaml の catalogs から、選ばれなかった feature のブロックを消す
const lines = readFileSync("pnpm-workspace.yaml", "utf8").split("\n");
const out: string[] = [];
let inCatalogs = false;
let keep = true;
for (const line of lines) {
  if (line === "catalogs:") {
    inCatalogs = true;
    out.push(line);
    continue;
  }
  if (inCatalogs && !line.startsWith(" ")) inCatalogs = false;
  if (inCatalogs) {
    const key = /^ {2}"?([^" :]+)"?:/.exec(line);
    if (key) keep = features.includes(key[1]);
    if (keep) out.push(line);
    continue;
  }
  out.push(line);
}
let yaml = out.join("\n");
if (!/^catalogs:\n {2}/m.test(yaml)) yaml = yaml.replace(/^#.*\n?catalogs:\n?/m, "");
writeFileSync("pnpm-workspace.yaml", yaml);

const edit = (path: string, from: RegExp | string, to: string) =>
  writeFileSync(path, readFileSync(path, "utf8").replace(from, to));

// <!-- if css=tailwind --> ... <!-- endif --> は選択が一致すれば中身を残す。<!-- if template --> は常に消す
const holds = (cond: string) => {
  const [key, value] = cond.split("=");
  return value !== undefined && values[key] === value;
};
for (const path of ["README.md", "AGENTS.md"]) {
  const text = readFileSync(path, "utf8")
    .replace(/<!-- if (\S+) -->\n([\s\S]*?)<!-- endif -->\n/g, (_, cond: string, body: string) =>
      holds(cond) ? body : "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^# vite-plus-template$/m, `# ${projectName}`);
  writeFileSync(path, text);
}
edit("index.html", "<title>vite-plus-template</title>", `<title>${projectName}</title>`);
edit("vite.config.ts", '"vite-plus-template"', JSON.stringify(projectName)); // pwa の manifest.name
if (existsSync("cloudflare.config.ts")) {
  edit("cloudflare.config.ts", '"vite-plus-template"', JSON.stringify(projectName)); // worker の名前
}
edit("vite.config.ts", /^ *\/\/ features\/.*\n *ignorePatterns: \["features\/\*\*"\],\n/m, "");
edit("tsconfig.node.json", /,\s*"scripts"/, "");

for (const path of [
  "features",
  "scripts",
  ".github/workflows/template.yml",
  ".agents/skills/adding-features",
  ".agents/skills/upgrading-dependencies",
  "LICENSE",
]) {
  rmSync(path, { recursive: true, force: true });
}

// vp create(degit)はシンボリックリンクをキャッシュ内の絶対パスに変えるので、相対パスで作り直す
rmSync(".claude/skills", { force: true });
symlinkSync("../.agents/skills", ".claude/skills");

console.log(
  `setup 完了 (features: ${features.join(", ") || "なし"})。次に vp install を実行する。`,
);
