#!/usr/bin/env node
/**
 * 해외 레퍼런스 데이터 폴더 ↔ lib/references.json 변환기 + 매크로 결과 가져오기
 *
 *   node scripts/refs.mjs merge                 data/references/ → lib/references.json (앱이 읽는 파일 생성)
 *   node scripts/refs.mjs split [--force]       lib/references.json → data/references/ (폴더가 이미 있으면 --force 필요)
 *   node scripts/refs.mjs check                 두 쪽이 같은 내용인지 확인
 *   node scripts/refs.mjs import [파일.csv ...] [--keyword <id|키워드>] [--dry-run]
 *        매크로(insta-research)가 만든 .csv 를 읽어 계정을 키워드별 creators.json 에 넣고 merge 까지 실행.
 *        파일을 안 주면 data/references/_import.json 의 sources 폴더에 있는 .csv 를 모두 읽는다.
 *        --keyword 를 주면 발견 경로를 무시하고 모든 계정을 그 키워드에 넣는다.
 *   node scripts/refs.mjs watch [--every 초]
 *        sources 폴더의 .csv 가 바뀌는지 주기적으로(기본 30분) 보다가 바뀌면 import 를 실행. 매크로를 돌리는 동안 켜 두는 용도. Ctrl+C 로 종료.
 *
 * 폴더 구조
 *   data/references/_meta.json                        generatedAt(조사 날짜)
 *   data/references/_import.json                      매크로 가져오기 설정(읽을 폴더, 검색어→키워드 매핑)
 *   data/references/<그룹>/<NN>-<키워드>/meta.json      id · group · ko · tags
 *   data/references/<그룹>/<NN>-<키워드>/hashtag.json   해시태그 판정 + 상위 게시물
 *   data/references/<그룹>/<NN>-<키워드>/creators.json  해외 계정 목록
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data", "references");
const OUT = path.join(ROOT, "lib", "references.json");
const IMPORT_CFG = path.join(DATA, "_import.json");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 1) + "\n", "utf8");
};
const pad = (n) => String(n).padStart(2, "0");
const folderName = (k) => `${pad(k.id)}-${k.ko.trim().replace(/\s+/g, "-")}`;
const rel = (p) => path.relative(ROOT, p);

// ── split ─────────────────────────────────────────────────────────────────
function split(force) {
  const src = readJson(OUT);
  if (fs.existsSync(DATA) && !force) {
    console.error(`이미 ${rel(DATA)} 가 있습니다. 덮어쓰려면 --force 를 붙이세요 (폴더 안 수정 내용이 사라집니다).`);
    process.exit(1);
  }
  const keep = {};
  for (const f of ["_import.json", "README.md"]) {
    const p = path.join(DATA, f);
    if (fs.existsSync(p)) keep[f] = fs.readFileSync(p);
  }
  if (force && fs.existsSync(DATA)) fs.rmSync(DATA, { recursive: true });
  writeJson(path.join(DATA, "_meta.json"), { generatedAt: src.generatedAt });
  for (const [f, buf] of Object.entries(keep)) fs.writeFileSync(path.join(DATA, f), buf);
  for (const k of src.keywords) {
    const dir = path.join(DATA, k.group, folderName(k));
    writeJson(path.join(dir, "meta.json"), { id: k.id, group: k.group, ko: k.ko, tags: k.tags });
    writeJson(path.join(dir, "hashtag.json"), k.hashtag);
    writeJson(path.join(dir, "creators.json"), k.creators);
  }
  console.log(`split: 키워드 ${src.keywords.length}개 → ${rel(DATA)}/`);
}

// ── 폴더 읽기 ─────────────────────────────────────────────────────────────
/** 키워드 폴더를 모두 읽어 [{dir, meta, hashtag, creators}] 로 돌려준다 (id 순) */
function loadKeywordDirs() {
  if (!fs.existsSync(DATA)) throw new Error(`${rel(DATA)} 가 없습니다. 먼저 split 을 실행하세요.`);
  const items = [];
  const seen = new Map();
  for (const group of fs.readdirSync(DATA, { withFileTypes: true })) {
    if (!group.isDirectory() || group.name.startsWith("_") || group.name.startsWith(".")) continue;
    const gdir = path.join(DATA, group.name);
    for (const kw of fs.readdirSync(gdir, { withFileTypes: true })) {
      if (!kw.isDirectory() || kw.name.startsWith(".")) continue;
      const dir = path.join(gdir, kw.name);
      const r = rel(dir);
      const meta = readJson(path.join(dir, "meta.json"));
      for (const f of ["id", "group", "ko", "tags"]) if (meta[f] === undefined) throw new Error(`${r}/meta.json 에 ${f} 가 없습니다`);
      if (meta.group !== group.name) throw new Error(`${r}/meta.json 의 group("${meta.group}")이 폴더 이름("${group.name}")과 다릅니다`);
      if (seen.has(meta.id)) throw new Error(`id ${meta.id} 가 중복됩니다: ${seen.get(meta.id)} 와 ${r}`);
      seen.set(meta.id, r);
      const hashtag = readJson(path.join(dir, "hashtag.json"));
      const cpath = path.join(dir, "creators.json");
      const creators = fs.existsSync(cpath) ? readJson(cpath) : [];
      if (!Array.isArray(creators)) throw new Error(`${r}/creators.json 은 배열이어야 합니다`);
      items.push({ dir, meta, hashtag, creators });
    }
  }
  items.sort((a, b) => a.meta.id - b.meta.id);
  return items;
}

function collect() {
  const meta = readJson(path.join(DATA, "_meta.json"));
  const keywords = loadKeywordDirs().map(({ meta: m, hashtag, creators }) => ({ id: m.id, group: m.group, ko: m.ko, tags: m.tags, hashtag, creators }));
  return { generatedAt: meta.generatedAt, keywords };
}

function merge() {
  const data = collect();
  writeJson(OUT, data);
  const creators = data.keywords.reduce((n, k) => n + k.creators.length, 0);
  const posts = data.keywords.reduce((n, k) => n + (k.hashtag.posts?.length ?? 0), 0);
  console.log(`merge: 키워드 ${data.keywords.length} · 계정 ${creators} · 게시물 ${posts} → ${rel(OUT)}`);
}

function check() {
  const a = JSON.stringify(collect());
  const b = JSON.stringify(readJson(OUT));
  if (a === b) console.log("check: data/references/ 와 lib/references.json 이 같습니다");
  else { console.error("check: 다릅니다 — `npm run refs:merge` 를 실행하세요"); process.exit(1); }
}

// ── import: 매크로 CSV → creators.json ────────────────────────────────────
/** RFC4180 CSV 파서 — 따옴표 안 줄바꿈(히트 게시물 칸) 지원, BOM 제거 */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ""));
}

function csvObjects(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const num = (s) => { const n = Number(String(s ?? "").replace(/,/g, "")); return Number.isFinite(n) && s !== "" ? n : null; };
function fmtFollowers(n) {
  if (n == null) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}
function fmtViews(n) {
  if (n == null) return "";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString("ko-KR")}만`;
  return n.toLocaleString("ko-KR");
}
/** "릴스 · 조회 1,234,567 · 댓글 456 · https://…" 한 줄 → {kind, views, comments, url} */
function parseHits(text) {
  return String(text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.split(" · ").map((x) => x.trim());
    const kind = parts[0] ?? "";
    const v = parts.find((x) => x.startsWith("조회")) ?? "";
    const c = parts.find((x) => x.startsWith("댓글")) ?? "";
    const url = parts.find((x) => /^https?:\/\//.test(x)) ?? "";
    return { kind, views: /비공개/.test(v) ? null : num(v.replace(/^조회\s*/, "")), comments: num(c.replace(/^댓글\s*/, "")), url };
  }).filter((h) => h.url);
}
const normTerm = (s) => String(s ?? "").replace(/^키워드\s+/, "").replace(/^#/, "").trim().toLowerCase();

function loadImportCfg() {
  const cfg = fs.existsSync(IMPORT_CFG) ? readJson(IMPORT_CFG) : {};
  return { sources: cfg.sources ?? ["data/inbox"], map: cfg.map ?? {}, skip: cfg.skip ?? [] };
}

/** 검색어 하나 → 키워드 id 목록. _import.json 의 map 이 우선, 없으면 tags / hashtag.query 대조 */
function resolveKeyword(source, items, cfg) {
  const term = normTerm(source);
  const byKo = new Map(items.map((it) => [it.meta.ko, it.meta.id]));
  const toId = (v) => (typeof v === "number" ? v : byKo.get(String(v)) ?? (Number.isFinite(Number(v)) ? Number(v) : undefined));
  const mapped = cfg.map[source] ?? cfg.map[term] ?? cfg.map[`#${term}`];
  if (mapped !== undefined) {
    const ids = (Array.isArray(mapped) ? mapped : [mapped]).map(toId).filter((x) => x !== undefined);
    if (ids.length) return ids;
  }
  const ids = [];
  for (const it of items) {
    const tags = (it.meta.tags ?? []).map((t) => t.toLowerCase());
    const q = String(it.hashtag?.query ?? "").split("·").map((x) => normTerm(x));
    if (tags.includes(term) || q.includes(term)) ids.push(it.meta.id);
  }
  return ids;
}

function creatorFromRow(r, today) {
  const handle = r["아이디"].replace(/^@/, "");
  const followersN = num(r["팔로워"]);
  const hits = parseHits(r["히트 게시물 (유형 · 조회수 · 댓글 · 링크)"]);
  const er = num(r["참여율(%)"]);
  const reelViews = num(r["릴스 평균 조회수"]);
  const bio = (r["바이오"] ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0] ?? "";
  const bits = [`매크로 수집 ${today}`];
  bits.push(`히트 게시물 ${r["히트 게시물 수"] || hits.length}/${r["확인한 게시물 수"] || "?"}개`);
  if (er != null) bits.push(`참여율 ${er}%`);
  if (reelViews != null) bits.push(`릴스 평균 조회 ${fmtViews(reelViews)}`);
  if (r["카테고리"]) bits.push(r["카테고리"]);
  const desc = bits.join(" · ") + (bio ? ` — ${bio.slice(0, 80)}` : "");
  // 대표 영상 1개: 매크로가 계정마다 가장 잘 된 영상을 골라 담아준다
  const videoUrl = r["대표 영상 링크"] ?? "";
  const video = videoUrl
    ? {
        url: videoUrl,
        kind: r["대표 영상 유형"] ?? "",
        views: num(r["대표 영상 조회수"]),
        comments: num(r["대표 영상 댓글"]),
        likes: num(r["대표 영상 좋아요"]),
        caption: (r["대표 영상 캡션"] ?? "").slice(0, 300),
      }
    : (hits[0] ?? null);
  return {
    handle,
    url: r["프로필 URL"] || `https://www.instagram.com/${handle}/`,
    name: r["이름"] ?? "",
    country: "",
    followers: fmtFollowers(followersN),
    format: r["콘텐츠 유형"] ?? "",
    desc,
    aux: false,
    metrics: {
      followers: followersN, hitCount: num(r["히트 게시물 수"]), checked: num(r["확인한 게시물 수"]),
      engagement: er, avgLikes: num(r["평균 좋아요"]), avgComments: num(r["평균 댓글"]),
      reelRatio: num(r["릴스 비율(%)"]), avgReelViews: reelViews, postsPerWeek: num(r["주당 게시물"]), lastPostAt: r["최근 게시일"] || null,
    },
    video,
    hits,
    sources: (r["발견 경로"] ?? "").split(" / ").map((s) => s.trim()).filter(Boolean),
    importedAt: today,
  };
}

/** 기존 항목이 있으면 손으로 쓴 값(국가·설명·보조 여부)은 지키고 수치만 갱신 */
function upsert(list, incoming) {
  const i = list.findIndex((c) => c.handle.toLowerCase() === incoming.handle.toLowerCase());
  if (i < 0) { list.push(incoming); return "added"; }
  const old = list[i];
  const isAuto = !old.desc || /^매크로 수집/.test(old.desc);
  list[i] = {
    ...old,
    url: incoming.url || old.url,
    name: old.name || incoming.name,
    followers: incoming.followers || old.followers,
    format: old.format || incoming.format,
    desc: isAuto ? incoming.desc : old.desc,
    metrics: incoming.metrics,
    video: incoming.video ?? old.video ?? null,
    hits: incoming.hits.length ? incoming.hits : old.hits ?? [],
    sources: [...new Set([...(old.sources ?? []), ...incoming.sources])],
    importedAt: incoming.importedAt,
  };
  return "updated";
}

function importCsv(files, opts) {
  const cfg = loadImportCfg();
  const items = loadKeywordDirs();
  const byId = new Map(items.map((it) => [it.meta.id, it]));
  const today = new Date().toISOString().slice(0, 10);

  if (!files.length) {
    for (const dir of cfg.sources) {
      const abs = path.resolve(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      for (const f of fs.readdirSync(abs)) if (f.endsWith(".csv") && !cfg.skip.includes(f)) files.push(path.join(abs, f));
    }
    if (!files.length) { console.log(`import: 읽을 .csv 가 없습니다 (${cfg.sources.join(", ")})`); return; }
  }
  let forced = null;
  if (opts.keyword) {
    const ids = resolveKeyword(opts.keyword, items, cfg);
    const byKo = items.find((it) => it.meta.ko === opts.keyword || String(it.meta.id) === opts.keyword);
    forced = byKo ? [byKo.meta.id] : ids;
    if (!forced.length) throw new Error(`--keyword "${opts.keyword}" 에 맞는 키워드가 없습니다`);
  }

  const touched = new Map(); // id → {added, updated}
  const unmatched = new Map(); // source → [handles]
  let total = 0;
  for (const file of files) {
    const rows = csvObjects(file);
    if (!rows.length || !("아이디" in rows[0])) { console.log(`- ${rel(file)}: 매크로 형식이 아니라 건너뜀`); continue; }
    let assigned = 0;
    for (const r of rows) {
      if (!r["아이디"] || !r["프로필 URL"] || !r["발견 경로"]) continue; // 쓰는 도중 잘린 행 방지
      total++;
      const c = creatorFromRow(r, today);
      const ids = new Set(forced ?? []);
      if (!forced) {
        for (const s of c.sources) {
          const found = resolveKeyword(s, items, cfg);
          if (!found.length) unmatched.set(s, [...(unmatched.get(s) ?? []), c.handle]);
          found.forEach((id) => ids.add(id));
        }
      }
      if (!ids.size) continue;
      assigned++;
      for (const id of ids) {
        const it = byId.get(id);
        if (!it) { console.error(`  ! id ${id} 키워드가 없어 @${c.handle} 를 못 넣음`); continue; }
        const how = upsert(it.creators, structuredClone(c));
        const t = touched.get(id) ?? { added: 0, updated: 0 };
        t[how]++; touched.set(id, t);
      }
    }
    console.log(`- ${rel(file)}: 계정 ${rows.length}개 중 ${assigned}개 배정`);
  }

  for (const [id, t] of [...touched].sort((a, b) => a[0] - b[0])) {
    const it = byId.get(id);
    console.log(`  ${pad(id)} ${it.meta.group}/${it.meta.ko}: 추가 ${t.added} · 갱신 ${t.updated} (총 ${it.creators.length})`);
  }
  if (unmatched.size) {
    console.log(`\n키워드를 못 찾은 검색어 — ${rel(IMPORT_CFG)} 의 "map" 에 넣어 주세요 (예: "${[...unmatched.keys()][0]}": <id 또는 키워드>)`);
    for (const [s, hs] of unmatched) console.log(`  "${s}" ← @${[...new Set(hs)].slice(0, 6).join(", @")}${hs.length > 6 ? " …" : ""} (${new Set(hs).size}개)`);
  }
  if (opts.dryRun) { console.log(`\n(dry-run) 파일은 바꾸지 않았습니다. 총 ${total}행`); return; }
  for (const it of items) if (touched.has(it.meta.id)) writeJson(path.join(it.dir, "creators.json"), it.creators);
  merge();
}

// ── watch: 매크로가 돌아가는 동안 결과 파일이 바뀌면 자동 import ─────────
function listSourceCsvs() {
  const cfg = loadImportCfg();
  const out = [];
  for (const dir of cfg.sources) {
    const abs = path.resolve(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (f.endsWith(".csv") && !cfg.skip.includes(f)) out.push(path.join(abs, f));
  }
  return out;
}

function watch(everySec) {
  const every = Math.max(15, everySec || 1800) * 1000; // 기본 30분
  const stamp = () => new Date().toLocaleTimeString("ko-KR", { hour12: false });
  const seen = new Map(); // file → mtimeMs (마지막으로 가져온 시점)
  const cfg = loadImportCfg();
  console.log(`watch: ${cfg.sources.join(", ")} 의 .csv 를 ${every >= 60000 ? `${every / 60000}분` : `${every / 1000}초`}마다 확인합니다. 바뀐 파일이 있으면 자동으로 가져옵니다. (Ctrl+C 로 종료)`);
  const tick = () => {
    try {
      const changed = [];
      for (const f of listSourceCsvs()) {
        const m = fs.statSync(f).mtimeMs;
        // 매크로가 파일을 쓰는 도중일 수 있으니 마지막 수정 후 5초는 기다린다
        if (Date.now() - m < 5000) continue;
        if (seen.get(f) !== m) { changed.push(f); seen.set(f, m); }
      }
      if (!changed.length) return;
      console.log(`\n[${stamp()}] 바뀐 파일 ${changed.length}개 → 가져오기`);
      importCsv(changed, {});
    } catch (e) {
      console.error(`[${stamp()}] 가져오기 실패 (다음 확인에서 다시 시도): ${e.message}`);
    }
  };
  tick();
  setInterval(tick, every);
}

// ── CLI ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = argv.slice(1);
const opt = (name) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : undefined; };
const positional = flags.filter((f, i) => !f.startsWith("--") && flags[i - 1] !== "--keyword");
try {
  if (cmd === "split") split(flags.includes("--force"));
  else if (cmd === "merge") merge();
  else if (cmd === "check") check();
  else if (cmd === "import") importCsv(positional.map((p) => path.resolve(p)), { keyword: opt("--keyword"), dryRun: flags.includes("--dry-run") });
  else if (cmd === "watch") watch(Number(opt("--every")));
  else { console.error("사용법: node scripts/refs.mjs <split [--force] | merge | check | import [파일.csv …] [--keyword <id|키워드>] [--dry-run] | watch [--every 초]>"); process.exit(2); }
} catch (e) { console.error(e.message); process.exit(1); }
