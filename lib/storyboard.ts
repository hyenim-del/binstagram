/**
 * 「PDF 스토리보드」 — 사용 중인 안의 문장을 훅·본문·CTA 챕터로 묶고, 문장마다 레퍼런스 영상의 장면을 캡처해 붙인
 * 인쇄용 페이지를 만든다. 새 탭에서 열고 브라우저의 「인쇄 → PDF로 저장」으로 내보낸다(한글 폰트 문제 없이 고품질).
 * 브라우저 전용(document·canvas·IndexedDB 사용).
 *
 * 장면 위치: 새 대본의 시간초는 원본과 길이가 다르므로 비율로 맞춘다 — 새 대본 30초 중 10초 지점 = 원본 60초 중 20초 지점.
 * 훅은 원본 앞부분, CTA는 뒷부분 장면이 붙는다.
 */
import { ANALYSIS_FIELDS, SECTION_KO, sectionOf, type Analysis, type NewLine, type Section } from "@/lib/convert";
import { loadMedia } from "@/lib/mediaStore";
import { toDisplayTime } from "@/lib/srt";
import type { Segment } from "@/lib/types";

export type StoryboardInput = {
  title: string;
  variantLabel: string; // "C안 후킹형"
  topic: string;
  sourceName: string;
  sourceUrl?: string | null;
  lines: NewLine[];
  frames: (string | null)[]; // 문장별 캡처(data URL). 없으면 null
  createdAt?: number;
  /** 레퍼런스 원본 대본(영문 등)과 한글 번역 — PDF 한 장에서 레퍼런스 정보를 다 볼 수 있게(2026-09-03) */
  source?: { segments: Segment[]; translations: string[] | null };
  /** 구조 분석 13항목 */
  analysis?: Analysis | null;
};

const THUMB_W = 360;

/** 문장 가운데 시각을 원본 영상 시각으로 비례 변환해 장면을 캡처한다. 영상이 없거나(붙여넣은 대본·오디오) 실패하면 null */
export async function captureFrames(jobId: string | null, lines: NewLine[]): Promise<(string | null)[]> {
  const none = lines.map(() => null);
  if (!jobId || !lines.length) return none;
  const blob = await loadMedia(jobId);
  if (!blob || !blob.type.startsWith("video")) return none;

  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video load failed"));
    });
    if (!video.videoWidth || !isFinite(video.duration) || video.duration <= 0) return none;

    const newTotal = Math.max(0.1, lines[lines.length - 1].end);
    const scale = video.duration / newTotal;
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_W;
    canvas.height = Math.round((THUMB_W * video.videoHeight) / video.videoWidth);
    const ctx = canvas.getContext("2d");
    if (!ctx) return none;

    const out: (string | null)[] = [];
    for (const l of lines) {
      const mid = (l.start + l.end) / 2;
      const t = Math.min(Math.max(0, mid * scale), Math.max(0, video.duration - 0.15));
      const ok = await seekTo(video, t);
      if (!ok) {
        out.push(null);
        continue;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      out.push(canvas.toDataURL("image/jpeg", 0.82));
    }
    return out;
  } catch {
    return none;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function seekTo(video: HTMLVideoElement, t: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 4000);
    video.onseeked = () => {
      clearTimeout(timer);
      resolve(true);
    };
    if (Math.abs(video.currentTime - t) < 0.01) video.currentTime = t + 0.02;
    else video.currentTime = t;
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 인쇄용 HTML 문서 전체를 만든다 */
export function buildStoryboardHtml(input: StoryboardInput): string {
  const { lines, frames } = input;
  const total = lines.length ? lines[lines.length - 1].end : 0;
  const chars = lines.reduce((n, l) => n + l.text.replace(/\s/g, "").length, 0);
  const sections: Section[] = ["HOOK", "BODY", "CTA"];
  const hasFrames = frames.some(Boolean);
  const dateStr = new Date(input.createdAt ?? Date.now()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const chapters = sections
    .map((sec) => {
      const items = lines.map((l, i) => ({ l, i })).filter((x) => sectionOf(x.l.role) === sec);
      if (!items.length) return "";
      const first = items[0].l, last = items[items.length - 1].l;
      const secDur = last.end - first.start;
      const rows = items
        .map(({ l, i }) => {
          const frame = frames[i];
          const thumb = frame
            ? `<img class="thumb" src="${frame}" alt="레퍼런스 영상 ${toDisplayTime(l.start)} 장면">`
            : `<div class="thumb none"><span>장면 없음</span></div>`;
          return `<div class="row">
            ${thumb}
            <div class="body">
              <div class="meta"><span class="no">${String(i + 1).padStart(2, "0")}</span><span class="tc">${toDisplayTime(l.start)} – ${toDisplayTime(l.end)}</span><span class="dur">${(l.end - l.start).toFixed(1)}s</span>${l.role ? `<span class="role">${esc(l.role)}</span>` : ""}</div>
              <p class="text">${esc(l.text)}</p>
              ${l.why ? `<p class="why">${esc(l.why)}</p>` : ""}
            </div>
          </div>`;
        })
        .join("\n");
      return `<section class="chapter ${sec.toLowerCase()}">
        <header class="ch-head">
          <span class="ch-tag">${sec}</span>
          <span class="ch-ko">${SECTION_KO[sec]}</span>
          <span class="ch-meta">${toDisplayTime(first.start)} – ${toDisplayTime(last.end)} · ${secDur.toFixed(1)}s · ${items.length}문장</span>
        </header>
        ${rows}
      </section>`;
    })
    .join("\n");

  const src = input.source;
  const hasTrans = !!src?.translations?.some(Boolean);
  const sourceSection = src?.segments.length
    ? `<section class="ref">
        <header class="ch-head">
          <span class="ch-tag ref">REFERENCE</span>
          <span class="ch-ko">레퍼런스 원본 대본${hasTrans ? " · 한글 번역" : ""}</span>
          <span class="ch-meta">${src.segments.length}문장 · ${toDisplayTime(src.segments[src.segments.length - 1].end)}</span>
        </header>
        <div class="ref-rows${hasTrans ? " two" : ""}">
          ${src.segments
            .map(
              (seg, i) => `<div class="ref-row">
            <span class="tc">${toDisplayTime(seg.start)}</span>
            <span class="orig">${esc(seg.text)}</span>
            ${hasTrans ? `<span class="tr">${esc(src.translations?.[i] ?? "")}</span>` : ""}
          </div>`
            )
            .join("\n")}
        </div>
      </section>`
    : "";
  const groups = Array.from(new Set(ANALYSIS_FIELDS.map((f) => f.group)));
  const analysisSection = input.analysis
    ? `<section class="an">
        <header class="ch-head">
          <span class="ch-tag ref">DESIGN</span>
          <span class="ch-ko">구조 설계도 13항목</span>
          <span class="ch-meta">새 대본이 따른 레퍼런스의 구조</span>
        </header>
        <div class="an-grid">
          ${groups
            .map(
              (g) => `<div class="an-group">
            <div class="an-g">${esc(g)}</div>
            ${ANALYSIS_FIELDS.filter((f) => f.group === g)
              .map((f) => `<div class="an-row"><span class="an-k">${esc(f.label)}</span><span class="an-v">${esc(input.analysis?.[f.key] || "—")}</span></div>`)
              .join("")}
          </div>`
            )
            .join("")}
        </div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.title)} · ${esc(input.variantLabel)} 스토리보드</title>
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #ECEEF1; color: #1B2430; font-family: "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", -apple-system, sans-serif; font-size: 12.5px; line-height: 1.6; }
  .toolbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 14px; padding: 12px 24px; background: #1B2430; color: #E8ECF0; }
  .toolbar b { font-size: 14px; }
  .toolbar .hint { color: #9AA7B4; font-size: 12.5px; }
  .toolbar button { margin-left: auto; height: 38px; padding: 0 18px; border-radius: 999px; border: 0; background: #E0B34A; color: #1B2430; font-weight: 700; font-size: 14px; cursor: pointer; }
  .toolbar button:hover { filter: brightness(1.08); }
  .sheet { max-width: 210mm; margin: 24px auto 48px; background: #fff; padding: 16mm 14mm 18mm; box-shadow: 0 6px 30px rgba(0,0,0,.12); }
  h1 { font-size: 22px; line-height: 1.3; margin: 0 0 6px; letter-spacing: -0.01em; }
  .sub { color: #5A6978; font-size: 12.5px; margin: 0; }
  .topic { margin: 14px 0 0; padding: 10px 14px; border-left: 3px solid #B8860B; background: #FBF7EC; font-size: 13px; }
  .topic b { display: block; font-size: 11px; letter-spacing: .08em; color: #8A6A12; margin-bottom: 2px; }
  .stats { display: flex; gap: 18px; margin: 14px 0 0; padding: 10px 0; border-top: 1px solid #DCE2E8; border-bottom: 1px solid #DCE2E8; font-size: 12px; color: #5A6978; }
  .stats b { color: #1B2430; font-variant-numeric: tabular-nums; }
  .chapter { margin-top: 18px; break-inside: auto; }
  .ch-head { display: flex; align-items: baseline; gap: 10px; padding: 6px 0; border-bottom: 2px solid #1B2430; margin-bottom: 8px; break-after: avoid; }
  .ch-tag { font-family: ui-monospace, Menlo, monospace; font-size: 11px; letter-spacing: .12em; padding: 2px 8px; border-radius: 4px; color: #fff; background: #5A6978; }
  .chapter.hook .ch-tag { background: #B8860B; }
  .chapter.cta .ch-tag { background: #2F5FA8; }
  .ch-ko { font-weight: 700; font-size: 14px; }
  .ch-meta { margin-left: auto; color: #5A6978; font-size: 11.5px; font-variant-numeric: tabular-nums; }
  .row { display: grid; grid-template-columns: 88px 1fr; gap: 14px; padding: 8px 0; border-bottom: 1px solid #E6EAEE; break-inside: avoid; }
  .row:last-child { border-bottom: 0; }
  .thumb { width: 88px; height: 156px; object-fit: cover; border-radius: 6px; background: #111; display: block; }
  .thumb.none { display: flex; align-items: center; justify-content: center; background: #EEF1F4; border: 1px dashed #C9D1DA; color: #8A97A5; font-size: 10.5px; }
  .meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #5A6978; font-variant-numeric: tabular-nums; }
  .meta .no { font-family: ui-monospace, Menlo, monospace; color: #1B2430; font-weight: 700; }
  .meta .tc { font-family: ui-monospace, Menlo, monospace; }
  .meta .role { padding: 1px 7px; border-radius: 999px; background: #EEF1F4; color: #3D4B59; }
  .text { margin: 3px 0 0; font-size: 15px; font-weight: 600; line-height: 1.5; letter-spacing: -0.005em; }
  .why { margin: 3px 0 0; font-size: 11.5px; color: #6B7986; }
  /* 레퍼런스 원본 대본 · 구조 설계도 — 새 페이지에서 시작 */
  .ref, .an { margin-top: 22px; }
  /* 원본 대본과 설계도를 한 상자에 넣고 상자에만 새 페이지를 건다 — 섹션마다 걸면 크롬이 설계도를 다음 장으로 밀어낸다 */
  .refpage { break-before: page; }
  .ch-tag.ref { background: #1B2430; }
  .ref-rows { display: flex; flex-direction: column; }
  .ref-row { display: grid; grid-template-columns: 52px 1fr; gap: 6px 10px; padding: 6px 0; border-bottom: 1px solid #E6EAEE; font-size: 12.5px; break-inside: avoid; }
  .ref-rows.two .ref-row { grid-template-columns: 52px 1fr 1fr; }
  .ref-row:last-child { border-bottom: 0; }
  .ref-row .tc { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #5A6978; padding-top: 2px; }
  .ref-row .orig { color: #1B2430; }
  .ref-row .tr { color: #8A6A12; }
  .an-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 22px; }
  .an-group { break-inside: avoid; }
  .an-g { font-size: 11px; letter-spacing: .08em; color: #5A6978; font-family: ui-monospace, Menlo, monospace; padding: 4px 0; border-bottom: 1px solid #DCE2E8; margin-bottom: 4px; }
  .an-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; padding: 4px 0; font-size: 12px; }
  .an-k { color: #5A6978; }
  .an-v { color: #1B2430; }
  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #DCE2E8; font-size: 10.5px; color: #8A97A5; display: flex; justify-content: space-between; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <b>스토리보드 미리보기</b>
    <span class="hint">「PDF로 저장」을 누르고 인쇄 창에서 대상을 <b>PDF로 저장</b>으로 고르세요${hasFrames ? "" : " · 이 대본은 영상이 없어 장면 없이 나가요"}</span>
    <button onclick="window.print()">PDF로 저장</button>
  </div>
  <main class="sheet">
    <h1>${esc(input.title)}</h1>
    <p class="sub">${esc(input.variantLabel)} · 레퍼런스 ${esc(input.sourceName)}${input.sourceUrl ? ` · ${esc(input.sourceUrl)}` : ""}</p>
    ${input.topic ? `<div class="topic"><b>내 주제 · 제품 · 타겟</b>${esc(input.topic)}</div>` : ""}
    <div class="stats"><span>총 <b>${total.toFixed(1)}s</b></span><span><b>${lines.length}</b>문장</span><span><b>${chars}</b>자</span><span>말속도 초당 6.5자 기준</span>${hasFrames ? "<span>장면 = 레퍼런스 영상의 같은 비율 지점</span>" : ""}</div>
    ${chapters}
    ${sourceSection || analysisSection ? `<div class="refpage">${sourceSection}${analysisSection}</div>` : ""}
    <div class="foot"><span>BinStaGram · 레퍼런스 대본 변환</span><span>${dateStr}</span></div>
  </main>
</body>
</html>`;
}
